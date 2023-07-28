# Article Recommender

This tutorial demonstrates how to use Pinecone's similarity search to create a simple personalized article or content recommender.

The goal is to create a recommendation engine that retrieves the best article recommendations for each user. When making recommendations with content-based filtering, we evaluate the user’s past behavior and the content items themselves. So in this example, users will be recommended articles that are similar to those they've already read.

```bash
npm install
```

## Importing the Libraries

We'll start by importing the necessary libraries. We'll be using the `@pinecone-database/pinecone` library to interact with Pinecone. We'll also be using the `danfojs-node` library to load the data into an easy to manipulate dataframe. We'll use the `Document` type from Langchain to keep the data structure consistent across the indexing process and retrieval agent.

We'll be using the `Embedder` class found in `embeddings.ts` to embed the data We'll also be using the `cli-progress` library to display a progress bar.

To load the dataset used in the example, we'll be using a utility called `squadLoader.js`.

```typescript
import { Vector, utils } from "@pinecone-database/pinecone";
import { getEnv } from "utils/util.ts";
import { getPineconeClient } from "utils/pinecone.ts";
import cliProgress from "cli-progress";
import { Document } from "langchain/document";
import * as dfd from "danfojs-node";
import { embedder } from "embeddings.ts";
import { SquadRecord, loadSquad } from "./utils/squadLoader.js";
```

## Upload articles

Next, we will prepare data for the Pinecone vector index, and insert it in batches.

The [dataset](https://components.one/datasets/all-the-news-2-news-articles-dataset/) used throughout this example contains 2.7 million news articles and essays from 27 American publications.

Let's download the dataset.

```bash
wget https://www.dropbox.com/s/cn2utnr5ipathhh/all-the-news-2-1.zip -q --show-progress
unzip -q all-the-news-2-1.zip
mkdir data
mv all-the-news-2-1.csv data/.
```

## Create Vector embeddings

Since the dataset could be pretty big, we'll use a generator function that will yield chunks of data to be processed.

```typescript
async function* processInChunks<T, M extends keyof T, P extends keyof T>(
  dataFrame: dfd.DataFrame,
  chunkSize: number,
  metadataFields: M[],
  pageContentField: P
): AsyncGenerator<Document[]> {
  for (let i = 0; i < dataFrame.shape[0]; i += chunkSize) {
    const chunk = await getChunk(dataFrame, i, chunkSize);
    const records = dfd.toJSON(chunk) as T[];
    yield records.map((record: T) => {
      const metadata: Partial<Record<M, T[M]>> = {};
      for (const field of metadataFields) {
        metadata[field] = record[field];
      }
      return new Document({
        pageContent: record[pageContentField] as string,
        metadata,
      });
    });
  }
}
```

For each chunk, the function generates an array of `Document` objects. The function is defined with three type parameters: `T`, `M`, and `P`.

Here are the parameters the function accepts:

- `dataFrame`: This is the DataFrame that the function will process.
- `chunkSize`: This is the number of records that will be processed in each chunk.
- `metadataFields`: This is an array of field names (which are keys of `T`) to be included in the metadata of each `Document`.
- `pageContentField`: This is the field name (which is a key of `T`) to be used for the page content of each `Document`.

Here's what it the function does:

1. It loops over the DataFrame in chunks of size `chunkSize`.
2. For each chunk, it converts the chunk to JSON to get an array of records (of type `T`).
3. Then, for each record in the chunk, it:
   - Creates a `metadata` object that includes the specified metadata fields from the record.
   - Creates a new `Document` with the `pageContent` from the specified field in the record, and the `metadata` object.
4. It then yields an array of the created `Document` objects for the chunk.

The `yield` keyword is used here to produce a value from the generator function. This allows the function to produce a sequence of values over time, rather than computing them all at once and returning them in a single array.

Next we'll create a function that will generate the embeddings and upsert them into Pinecone. We'll use the `processInChunks` generator function to process the data in chunks. We'll also use the `chunkedUpsert` method to insert the embeddings into Pinecone in batches.

```typescript
async function embedAndUpsert(dataFrame: dfd.DataFrame, chunkSize: number) {
  const chunkGenerator = processInChunks(dataFrame, chunkSize);
  const index = pineconeClient.Index(indexName);

  for await (const documents of chunkGenerator) {
    await embedder.embedBatch(
      documents,
      chunkSize,
      async (embeddings: Vector[]) => {
        await chunkedUpsert(index, embeddings, "default");
        progressBar.increment(embeddings.length);
      }
    );
  }
}
```

We'll use the `splitFile` utility function to split the CSV file we downloaded into chunks of 100k parts each. For the purposes of this example, we'll only use the first 100k records.

```typescript
const fileParts = await splitFile("./data/all-the-news-2-1.csv", 1000000);
const firstFile = fileParts[0];
```

Next, we'll load the data into a DataFrame using `loadCSVFile` and to simplify things, we'll also drop all rows which include a null value.

```typescript
const data = await loadCSVFile(firstFile);
const clean = data.dropNa() as dfd.DataFrame;
```

Now we'll create the Pinecone index and kick off the embedding and upserting process.

```typescript
await createIndexIfNotExists(pineconeClient, indexName, 384);
progressBar.start(clean.shape[0], 0);
await embedder.init("Xenova/all-MiniLM-L6-v2");
await embedAndUpsert(clean, 1);
progressBar.stop();
```

## Query the Pinecone Index

We will query the index for the an imagined user. We'll simulate a set of the articles that the user previously read. Based on the article embeddings, we will define a unique embedding for the user.

```typescript
const indexName = getEnv("PINECONE_INDEX");
const pineconeClient = await getPineconeClient();
const pineconeIndex = pineconeClient.Index(indexName);

await embedder.init("Xenova/all-MiniLM-L6-v2");

// We create a simulated a user with an interest given a query and a specific section
const { query, section } = getQueryingCommandLineArguments();
const queryEmbedding = await embedder.embed(query);

const queryResult = await pineconeIndex.query({
  queryRequest: {
    vector: queryEmbedding.values,
    includeMetadata: true,
    includeValues: true,
    namespace: "default",
    filter: {
      section: { $eq: section },
    },
    topK: 10,
  },
});
```

We'll calculate the **mean** vector given the results of the query. The mean vector represents the user's interests based on the articles they've read.

```typescript
// We extract the vectors of the results
const userVectors = queryResult?.matches?.map(
  (result: ScoredVector) => result.values as number[]
);

// A couple of functions to calculate mean vector
const mean = (arr: number[]): number =>
  arr.reduce((a, b) => a + b, 0) / arr.length;
const meanVector = (vectors: number[][]): number[] => {
  const { length } = vectors[0];

  return Array.from({ length }).map((_, i) =>
    mean(vectors.map((vec) => vec[i]))
  );
};

// We calculate the mean vector of the results
const meanVec = meanVector(userVectors!);
```

To resolve the recommendations, we'll query the index with the mean vector and filter out the articles that the user has already read.

```typescript
const recommendations = await pineconeIndex.query({
  queryRequest: {
    vector: meanVec,
    includeMetadata: true,
    includeValues: true,
    namespace: "default",
    topK: 10,
  },
});
```

Finally, we'll use `console-table-printer` to print out the recommendations.

```typescript
const userPreferences = new Table({
  columns: [
    { name: "title", alignment: "left" },
    { name: "author", alignment: "left" },
    { name: "section", alignment: "left" },
  ],
});

const userRecommendations = new Table({
  columns: [
    { name: "title", alignment: "left" },
    { name: "author", alignment: "left" },
    { name: "section", alignment: "left" },
  ],
});

queryResult?.matches?.slice(0, 10).forEach((result: any) => {
  const { title, author, section } = result.metadata;
  userPreferences.addRow({
    title,
    author,
    section,
  });
});

console.log("========== User Preferences ==========");
userPreferences.printTable();

recommendations?.matches?.slice(0, 10).forEach((result: any) => {
  const { title, author, section } = result.metadata;
  userRecommendations.addRow({
    title,
    author,
    section,
  });
});
console.log("=========== Recommendations ==========");
userRecommendations.printTable();
```

### Query Sports user

To get the result for a simulated user with an interest in Sports and specifically Tennis, we'll run:

```bash
npm run recommend -- --query="tennis" --section="Sports"
```

| Index | Title                                                                                                  | Article                                                                   | Section | Publication |
| :---- | :----------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------ | :------ | :---------- |
| 0     | "Just Ask Anybody": Searching for Match-Fixing in Minor League Tennis                                  | Uladzimir Ignatik, a six-foot-tall 25-year-old who, as a junior, was t... | Sports  | Vice        |
| 1     | MaliVai Washington on Men's Tennis Today and His Historic Wimbledon Run 20 Years Ago                   | Welcome to VICE Sports Q&A, where we talk to authors, directors, and o... | Sports  | Vice        |
| 2     | Venus, Serena, and the Power of Believing                                                              | On Saturday, another chapter in the best story in the history of sport... | Sports  | Vice        |
| 3     | John McEnroe Says Serena is "Best Female Player Ever," Reheats Dumb Debate                             | Here we ago again. Almost two decades after saying that any male colle... | Sports  | Vice        |
| 4     | Tennis Legend Margaret Court Went Off the Rails in Anti-LGBTQ Tirade                                   | Margaret Court, the most decorated tennis player in history, has had a... | Sports  | Vice        |
| 5     | Here is Wimbledon Darling Marcus Willis with a Mid-Match Soda and Candy Bar Back in His "Tubster" Days | Despite being currently ranked 772nd in the world, Englishman Marcus W... | Sports  | Vice        |
| 6     | This Backhand by Kiki Mladenovic Is So Good, It Just Doesn't Make Sense                                | French No. 1 Kiki Mladenovic is having a helluva week. Yesterday, she ... | Sports  | Vice        |
| 7     | “A Rebel From The Wrong Side of the Tennis Tramlines” – The Legacy of Fred Perry                       | This article originally appeared on VICE Sports UK. When spectators en... | Sports  | Vice        |
| 8     | This Phoenix Suns Fast Break Is Better Than Sex                                                        | People sure like to call sports a "dance." There even was a long New Y... | Sports  | Vice        |
| 9     | Human Slimeball Chris Christie Oozes Creepily About Women's Tennis                                     | Former Republican presidential candidate Chris Christie is pretty good... | Sports  | Vice        |

And here are the recommended articles for this user:

| Index | Title                                                                                | Article                                                                   | Section     | Publication |
| :---- | :----------------------------------------------------------------------------------- | :------------------------------------------------------------------------ | :---------- | :---------- |
| 0     | MaliVai Washington on Men's Tennis Today and His Historic Wimbledon Run 20 Years Ago | Welcome to VICE Sports Q&A, where we talk to authors, directors, and o... | Sports      | Vice        |
| 1     | Wimbledon crowd go loco for Coco as dream continues                                  | LONDON (Reuters) - Did she win? Did she win?... Men, women, girls and...  | Sports News | Reuters     |
| 2     | "Just Ask Anybody": Searching for Match-Fixing in Minor League Tennis                | Uladzimir Ignatik, a six-foot-tall 25-year-old who, as a junior, was t... | Sports      | Vice        |
| 3     | Williams' U.S. Open treatment divides tennis world                                   | NEW YORK (Reuters) - Serena Williams’ behavior in Saturday’s U.S. Open... | Sports News | Reuters     |
| 4     | John McEnroe Says Serena is "Best Female Player Ever," Reheats Dumb Debate           | Here we ago again. Almost two decades after saying that any male colle... | Sports      | Vice        |
| 5     | Venus, Serena, and the Power of Believing                                            | On Saturday, another chapter in the best story in the history of sport... | Sports      | Vice        |
| 6     | Serena survives Fourth of July test by Slovenian student                             | LONDON (Reuters) - For the second time in four days a Wimbledon champi... | Sports News | Reuters     |
| 7     | Nadal rebuffs interrogator who dared to question Centre Court status                 | LONDON (Reuters) - It was a case of “Don’t you know who I am?” for Raf... | Sports News | Reuters     |
| 8     | School girl Gauff turfs idol Venus out of Wimbledon                                  | LONDON (Reuters) - Cori Gauff served up the perfect excuse for playing... | Sports News | Reuters     |
| 9     | As women wilt at Wimbledon, men's Big Three march on                                 | LONDON (Reuters) - As the Wimbledon women’s quarter-finals take place ... | Sports News | Reuters     |

### Query Games user

To get the result for a simulated user with an interest in Games and specifically Xbox, we'll run:

```bash
npm run recommend -- --query="Xbox" --section="Games"
```

As expected, we can see that the recommendations are similar to the user's preferences, with a focus on Tennis.

Here are the user's preferences:

| Index | Title                                                                              | Article                                                                   | Section | Publication |
| :---- | :--------------------------------------------------------------------------------- | :------------------------------------------------------------------------ | :------ | :---------- |
| 0     | Everything We Learned About the Next Gen Xbox at Microsoft's Press Conference      | Microsoft revealed the next Xbox on Sunday during its E3 press confer...  | Games   | Vice        |
| 1     | Sony Is Finally Adding PlayStation 4 External Hard Drive Support                   | Above: An upright, slim-model PlayStation 4. Photography courtesy of ...  | Games   | Vice        |
| 2     | A Title Card vs Six Teraflops: How Metroid Stole Microsoft’s Thunder               | As I've said already, E3 shouldn't be about which company "won" and w...  | Games   | Vice        |
| 3     | A Canadian Man Is Pissed That His Son Ran Up an $8,800 Xbox Bill in FIFA Purchases | A Pembroke, Ontario, gun shop owner is "mad as a hatter" over his son'... | Games   | Vice        |
| 4     | 'Phantom Dust' Was Ambitious, Beautiful, And Messy                                 | Guide to Games is Waypoint's weekly short video series diving into a ...  | Games   | Vice        |
| 5     | 'Forza Horizon 4' Is a Living Impressionist Landscape                              | On Waypoint Radio 193, Austin, Danielle, Rob, and Natalie discuss Rob'... | Games   | Vice        |
| 6     | An Overdue Apology to the Outgoing PlayStation Vita                                | I'm writing to you from New York. Just down the road from my hotel, in... | Games   | Vice        |
| 7     | The Switch and I: Early Adopters of Nintendo’s Console on its Joys and Cons        | It's easy enough for people who cover games for a living to dig into ...  | Games   | Vice        |
| 8     | The Nintendo 3DS Is the Greatest Handheld Console of All Time                      | Illustration by Stephen Maurice Graham Five years and the best part of... | Games   | Vice        |
| 9     | How the Game Genie Helped Me Understand My Brain Injury                            | Illustration by Stephen Maurice Graham There's a wonderful point in ch... | Games   | Vice        |

And here are the recommended articles for this user:

| Index | Title                                                                                   | Article                                                                   | Section      | Publication |
| :---- | :-------------------------------------------------------------------------------------- | :------------------------------------------------------------------------ | :----------- | :---------- |
| 0     | An Overdue Apology to the Outgoing PlayStation Vita                                     | I'm writing to you from New York. Just down the road from my hotel, in... | Games        | Vice        |
| 1     | The Nintendo 3DS Is the Greatest Handheld Console of All Time                           | Illustration by Stephen Maurice Graham Five years and the best part of... | Games        | Vice        |
| 2     | Sony Is Finally Adding PlayStation 4 External Hard Drive Support                        | Above: An upright, slim-model PlayStation 4. Photography courtesy of ...  | Games        | Vice        |
| 3     | The Switch and I: Early Adopters of Nintendo’s Console on its Joys and Cons             | It's easy enough for people who cover games for a living to dig into ...  | Games        | Vice        |
| 4     | Sony Is Putting the PlayStation's Back Catalog to Work for PC Gamers                    | Sony announced this week that PlayStation Now, the game-streaming subs... | Tech by VICE | Vice        |
| 5     | A Title Card vs Six Teraflops: How Metroid Stole Microsoft’s Thunder                    | As I've said already, E3 shouldn't be about which company "won" and w...  | Games        | Vice        |
| 6     | Like 'Breath of the Wild,' Switch's Success is Tied to Taking Big Risks                 | People have been predicting Nintendo's doom for longer than I can reme... | Games        | Vice        |
| 7     | UPDATE 2-Microsoft unveils next-gen "Project Scarlett" Xbox console for release in 2020 | (Adds quote from director of Xbox platform marketing) By Arjun Pancha...  | Company News | Reuters     |
| 8     | There’s Only One Reason to Own Nintendo’s New 2DS XL                                    | I already called the 3DS the greatest handheld console of all time. A...  | Games        | Vice        |
| 9     | 'Battlefield' Developer's Unreleased Sega Mega Drive Game Is Coming Out After 25 Years  | The history of video games is filled with unreleased games: Prey 2, ...   | Tech by VICE | Vice        |

### Query Business user

To get the result for a simulated user with an interest in Business and specifically Wall Street, we'll run:

```bash
npm run recommend -- --query="Wall Street" --section="Business News"
```

Here are the user's preferences:

| Index | Title                                                                                    | Article                                                                   | Section       | Publication |
| :---- | :--------------------------------------------------------------------------------------- | :------------------------------------------------------------------------ | :------------ | :---------- |
| 0     | Hexagon CEO Rollen found not guilty of insider trading in appeals case                   | OSLO (Reuters) - The chief executive of Swedish industrial technology ... | Business News | Reuters     |
| 1     | Hexagon CEO Rollen found not guilty of insider trading in appeals case                   | OSLO (Reuters) - The chief executive of Swedish industrial technology ... | Business News | Reuters     |
| 2     | Snapchat launches redesign as growth disappoints Wall Street                             | (Reuters) - Snap Inc (SNAP.N) is redesigning its disappearing-message ... | Business News | Reuters     |
| 3     | 'Don't ask my age': Ageing South Koreans begin a new chapter on the catwalk, YouTube     | SEOUL (Reuters) - Boasting an overgrown beard and grey wavy hair, 65-y... | Business News | Reuters     |
| 4     | Twitter warns fake account purge to keep erasing users, shares drop 19 percent           | NEW YORK (Reuters) - Twitter Inc (TWTR.N) on Friday said it lost 1 mil... | Business News | Reuters     |
| 5     | Reckitt picks PepsiCo executive as CEO, going outside for first time                     | (Reuters) - Consumer goods group Reckitt Benckiser has picked PepsiCo ... | Business News | Reuters     |
| 6     | Loyalists unhappy as Coach becomes Tapestry Inc                                          | (Reuters) - Iconic luxury handbag maker Coach Inc risked Wall Street a... | Business News | Reuters     |
| 7     | Cufflinks and the Caribbean: How Virgin Galactic kept space tourists' interest and money | COLORADO SPRINGS, Colo. (Reuters) - Virgin Galactic’s goal to fly tour... | Business News | Reuters     |
| 8     | Exclusive: Amazon scraps bundled video service - sources                                 | NEW YORK/LOS ANGELES (Reuters) - Amazon.com Inc (AMZN.O) has scrapped ... | Business News | Reuters     |
| 9     | With new CEO, Telecom Italia 'opera' edges towards finale                                | MILAN (Reuters) - Barely a year into the job as the boss of Italy’s bi... | Business News | Reuters     |

And here are the recommended articles for this user:

| Index | Title                                                                 | Article                                                                   | Section       | Publication |
| :---- | :-------------------------------------------------------------------- | :------------------------------------------------------------------------ | :------------ | :---------- |
| 0     | Snapchat launches redesign as growth disappoints Wall Street          | (Reuters) - Snap Inc (SNAP.N) is redesigning its disappearing-message ... | Business News | Reuters     |
| 1     | With new CEO, Telecom Italia 'opera' edges towards finale             | MILAN (Reuters) - Barely a year into the job as the boss of Italy’s bi... | Business News | Reuters     |
| 2     | Online lender SoFi nabs Twitter executive Noto as CEO                 | (Reuters) - Wall Street banker turned Silicon Valley executive Anthony... | Fintech       | Reuters     |
| 3     | End of Sorrell's reign heralds change for big ad empires              | LONDON (Reuters) - Martin Sorrell’s departure from the world’s biggest... | Business News | Reuters     |
| 4     | Loeb's Third Point takes new approach in battle with Nestle           | BOSTON (Reuters) - For a year, billionaire hedge fund manager Daniel L... | Wealth        | Reuters     |
| 5     | Greenlight comment adds to Tesla losses from Musk mocking SEC         | (Reuters) - Shares of Tesla Inc (TSLA.O) fell 7 percent on Friday, as ... | Business News | Reuters     |
| 6     | Out of Sorrell's shadow, Mark Read poised for top job at ad giant WPP | (Note strong language in final paragraph) By Kate Holton LONDON (Re...    | Business News | Reuters     |
| 7     | Gucci parent Kering moves to tighten grip on e-commerce               | PARIS (Reuters) - Kering, owner of brands including Gucci, will tighte... | Business News | Reuters     |
| 8     | Gucci parent Kering moves to tighten grip on e-commerce               | PARIS (Reuters) - Kering, owner of brands including Gucci, will tighte... | Business News | Reuters     |
| 9     | China's Tencent takes 12 percent stake in Snap as shares plunge       | (Reuters) - Snap Inc said on Wednesday that Chinese tech and media inv... | Business News | Reuters     |

## Query Results

We can see that each user's recommendations have a high similarity to what the user actually reads. A user who likes Tennis news has plenty of Tennis news recommendations. A user who likes to read about Xbox has that kind of news. And a business user has plenty of Wall Street news that they enjoy.

Since we used only the title and the content of the article to define the embeddings, and we did not take publications and sections into account, a user may get recommendations from a publication/section that they does not regularly read. You may try adding this information when creating embeddings as well and check your query results then!

Also, you may notice that some articles appear in the recommendations, although the user has already read them. These articles could be removed as part of postprocessing the query results, in case you prefer not to see them in the recommendations.
