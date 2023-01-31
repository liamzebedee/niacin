set -ex

# This is because forge/solc doesn't support symlinks.

rm -r lib/vercel3-contracts
cp -R ../contracts lib/vercel3-contracts