const path = require('path');
const fs = require('fs/promises');
const { glob } = require('glob');

const cachePath = path.join(__dirname, '..', 'cache');

/*
 * @returns {Promise<string[]>}
 *
 * Returns list of taggable resources from a cache file
 * or from reading the aws-cdk-lib ITaggable Resources
 */
const getResources = async () => {
  // use cached list if it exists in ${cachePath}/taggable.json
  const cacheFile = path.join(cachePath, 'cft_taggable_resources.json');
  let taggableResources;
  taggableResources = await getCachedFile(cacheFile);
  if (taggableResources) {
    return taggableResources;
  }
  // note: should be called during prepublishing only
  // cache miss, generate list of taggable resources
  taggableResources = await getResourcesFromAwsCdk();
  await mkCacheDir();
  await fs.writeFile(cacheFile, JSON.stringify(taggableResources, null, 2));
  return taggableResources;
};

/*
 * Private as this should not be called from consuming code
 * @returns {Promise<string[]>}
 *
 * Matches comments of an aws-* inside aws-cdk-lib
 * resource file "*generated.d.ts" definition
 * looking for @cloudformationResource and ITaggable
 */
const getResourcesFromAwsCdk = async () => {
  // note: should be called during prepublishing only
  const cdkDir = path.dirname(require.resolve('aws-cdk-lib'));
  const globPaths = [
    path.join(cdkDir, 'aws-*', 'lib', '*generated.d.ts'),
    `!${path.join(cdkDir, 'aws-*', 'lib', 'index.d.ts')}`,
  ];
  const paths = await glob(globPaths);
  const nestedResourceNames = await Promise.all(
    paths.map((file) => fileToTaggableResourceNames(file)),
  );
  return nestedResourceNames.flat();
};

const getResourceMap = async () => {
  const cacheFile = path.join(cachePath, 'cft_taggable_resource_map.json');
  let resTagMap;
  resTagMap = await getCachedFile(cacheFile);
  if (resTagMap) {
    return resTagMap;
  }
  // note: should be called during prepublishing only
  resTagMap = {};
  const resources = await getResources();
  // use cached map
  if (Object.keys(resTagMap).length > 0) {
    return resTagMap;
  }

  for (const resName of resources) {
    resTagMap[resName] = true;
  }
  // cache it
  await mkCacheDir();
  await fs.writeFile(cacheFile, JSON.stringify(resTagMap, null, 2));
  return resTagMap;
};

const isTaggableResource = async (resourceName) => {
  const resMp = await getResourceMap();
  return Boolean(resMp[resourceName]);
};

/*
 * @param {string} file
 * @returns {Promise<string[]>}
 *
 * Matches comments of an aws-* resource file d.ts file definition
 * looking for @cloudformationResource and ITaggable
 */
async function fileToTaggableResourceNames(file) {
  const taggableResources = [];
  const data = (await fs.readFile(file)).toString();
  // console.log(file);
  const matches = [...data.matchAll(/.*@cloudformationResource\s(.*)(\s.*){4}(ITaggable)/gm)];
  if (matches?.length >= 0) {
    for (const match of matches) {
      taggableResources.push(match[1]);
    }
  }
  return taggableResources;
}

/*
 * @param {string} cacheFile
 * @returns {Promise<T>}
 *
 */
async function getCachedFile(cacheFile) {
  try {
    const data = await fs.readFile(cacheFile);
    const cached = JSON.parse(data.toString());
    if (cached && cached.length > 0) {
      return cached;
    }
  } catch {
    // do nothing
  }
}

async function mkCacheDir() {
  try {
    await fs.access(cachePath);
  } catch {
    try {
      await fs.mkdir(cachePath, { recursive: true });
    } catch {
      // --force
    }
  }
}

module.exports = {
  getResources,
  getResourceMap,
  isTaggableResource,
};
