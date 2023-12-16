const express = require("express");
const postsRouter = express.Router();

const { requireUser } = require("./utils");

const {
  createPost,
  getAllPosts,
  updatePost,
  getPostById,
  deletePost,
  deletePostTagsById,
} = require("../db");

postsRouter.get("/", async (req, res, next) => {
  try {
    const allPosts = await getAllPosts();
    res.send(allPosts);

    const posts = allPosts.filter((post) => {
      // the post is active, doesn't matter who it belongs to
      if (post.active) {
        return true;
      }

      // the post is not active, but it belogs to the current user
      if (req.user && post.author.id === req.user.id) {
        return true;
      }

      // none of the above are true
      return false;
    });

    res.send({
      posts,
    });
  } catch ({ name, message }) {
    next({ name, message });
  }
});

postsRouter.post("/", requireUser, async (req, res, next) => {
  const { title, tags, content } = req.body;

  const postData = {};

  try {
    postData.authorId = req.user.id;
    postData.title = title;
    postData.content = content;
    postData.tags = tags;

    const post = await createPost(postData);

    if (post) {
      res.send(post);
    } else {
      next({
        name: "PostCreationError",
        message: "There was an error creating your post. Please try again.",
      });
    }
  } catch ({ name, message }) {
    next({ name, message });
  }
});

postsRouter.patch("/:postId", requireUser, async (req, res, next) => {
  const { postId } = req.params;
  const { title, content, tags } = req.body;

  const updateFields = {};

  if (tags && tags.length > 0) {
    // Cant run trim() on tags because trim is for strings not obj
    // updateFields.tags = tags.trim().split(/\s+/);
    // So I did this instead to ensure each tag is trimmed and
    // data remains in array for updatePost()
    Object.keys(tags).forEach((k) => (tags[k] = tags[k].trim()));
    updateFields.tags = tags;
  }

  if (title) {
    updateFields.title = title;
  }

  if (content) {
    updateFields.content = content;
  }

  try {
    const originalPost = await getPostById(postId);

    if (originalPost.author.id === req.user.id) {
      const updatedPost = await updatePost(postId, updateFields);
      res.send({ post: updatedPost });
    } else {
      next({
        name: "UnauthorizedUserError",
        message: "You cannot update a post that is not yours",
      });
    }
  } catch ({ name, message }) {
    next({ name, message });
  }
});

postsRouter.delete("/:postId", requireUser, async (req, res, next) => {
  // Gonna need some if statements
  // Only user with credentials should be able to delete
  // if id does NOT pertain to any post, return error
  // Send success message if success is successful
  const postId = req.params.postId;
  const postData = await getPostById(postId);

  if (postData === "no") {
    res.send(`There is no Post with an ID of ${postId}`);
  } else {
    const postAuthorId = postData.author.id;
    const currentUserId = req.user.id;
    if (postAuthorId === currentUserId) {
      const tagsResponse = await deletePostTagsById(postId);
      const postsResponse = await deletePost(postId);
      res.send(`Post ${postId} was successfully deleted!`);
    } else {
      res.send("You can only delete posts you created");
    }
  }
});

module.exports = postsRouter;
