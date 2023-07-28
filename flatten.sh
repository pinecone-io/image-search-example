#!/bin/bash

root_dir="./train"

find "$root_dir" -mindepth 2 -type f -print0 | while IFS= read -r -d '' file; do
    subdir=$(dirname "$file")
    subdir_name=$(basename "$subdir")
    base_file=$(basename "$file")
    mv "$file" "$root_dir/$subdir_name-$base_file"
done

# This part is optional. Uncomment if you want to remove empty subdirectories after moving the files
find "$root_dir" -mindepth 1 -type d -empty -delete
