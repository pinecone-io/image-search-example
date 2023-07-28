/* eslint-disable no-plusplus */
import fs from 'fs';
import readline from 'readline';

async function splitFile(filePath: string, numLinesPerPart: number): Promise<string[]> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let partIndex = 1;
  let lineIndex = 0;
  let writeStream = fs.createWriteStream(`${filePath}.${partIndex}`);
  const createdFiles: string[] = [`${filePath}.${partIndex}`];

  for await (const line of rl) {
    if (lineIndex === numLinesPerPart) {
      writeStream.end();
      lineIndex = 0;
      partIndex++;
      writeStream = fs.createWriteStream(`${filePath}.${partIndex}`);
      createdFiles.push(`${filePath}.${partIndex}`);
    }
    writeStream.write(`${line}\n`);
    lineIndex++;
  }

  if (!writeStream.closed) {
    writeStream.end();
  }

  return createdFiles;
}


export default splitFile;