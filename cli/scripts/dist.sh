#!/bin/bash
# set -ex

rm -rf dist/
cp -R build/ dist/

for filepath in build/**/*.js build/*.js; do
  # Extract the relative file path
  file="${filepath#build/}"

  # Create the output directory structure
  mkdir -p "dist/$(dirname "$file")"

  # Run Terser on the file and output to dist directory
  terser --compress --mangle -- "$filepath" > "dist/$file"

  echo "Processed: $file"
done


