const express = require("express");
const tagsRouter = express.Router();

const { getAllTags, getPostsByTagName } = require("../db");

tagsRouter.get("/", async (req, res, next) => {
  try {
    let tags = await getAllTags();

    res.send(tags.rows);
  } catch ({ name, message }) {
    next({ name, message });
  }
});

tagsRouter.get("/:tagName/posts", async (req, res, next) => {
  let { tagName } = req.params;

  // decode %23happy to #happy
  // Also convert happy to #happy
  tagName.includes("#")
    ? (tagName = decodeURIComponent(tagName))
    : (tagName = `#${tagName}`);

  try {
    const allPosts = await getPostsByTagName(tagName);

    const posts = allPosts.filter((post) => {
      if (post.active) {
        return true;
      }

      if (req.user && req.user.id === post.author.id) {
        return true;
      }

      return false;
    });

    res.send({ posts });
  } catch ({ name, message }) {
    next({ name, message });
  }
});

module.exports = tagsRouter;
