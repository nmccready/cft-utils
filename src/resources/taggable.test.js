const taggable = require('./taggable');
const assert = require('assert');

describe(taggable.isTaggableResource.name, function () {
  ['AWS::IAM::Role'].forEach(function (resourceName) {
    it(`${resourceName} is taggable`, async function () {
      const isTag = await taggable.isTaggableResource(resourceName);
      assert.ok(isTag);
    });
  });

  ['AWS::IAM::Policy', 'AWS::IAM::ManagedPolicy'].forEach(function (resourceName) {

    it(`${resourceName} is NOT taggable`, async function () {
      const isTag = await taggable.isTaggableResource(resourceName);
      assert.ok(!isTag);
    });
  });
});
