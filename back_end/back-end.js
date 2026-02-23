// Imports
const express = require("express");
const router = express.Router();
const app = express()

// Server variables
const {dal} = require("./data/DAL.js");
const PORT = 4000;

//Middleware 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
app.use("/", router);

app.listen(PORT, () => {
    console.log(`Express running on port ${PORT}`);
    console.log(`http://localhost:${PORT}/`);
});

router.get("/", async (req, res) => {
    const recipes = await dal.fetchAllRecipes();
    return res.json(recipes);
});

router.post("/", (req, res) => {
    dal.pushRecipe(req);
    
    response = 
    {
        code: 200,
        message: "Recipe added",
    }
    
    return response;
});

router.delete("/", (req, res) => { 
    dal.deleteRecipe(req)

    response = 
    {
        code: 200,
        message: "Recipe deleted",
    }
    
    return response;
});

router.put("/", (req, res) => {
    dal.modifyPost(req);

    response = 
    {
        code: 200,
        message: "Recipe Edited",
    }

    return response;
});


router.get("/recipes/:id", async (req, res) => {
    const recipe = await dal.fetchRecipeById(req.params.id);
    return res.json(recipe);
});

// accept a comment from the front end and forward it to the DAL
router.post("/recipes/:id/comments", async (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;
    const username = req.body.username || 'n/a';
    const rating = req.body.rating;
    const userId = req.body.userId || 'n/a';
    const timestamp = new Date().toISOString();

    const commentObj = {
        "text": comment,
        "rating": rating,
        "username": username,
        "userId": userId,
        "timestamp": timestamp,
    };

    try {
        await dal.addCommentToRecipe(id, commentObj);
        return res.json({ code: 200, message: "Comment added" });
    } catch (error) {
        console.error("Error adding comment: ", error);
        res.status(500).json({ error: "Failed to add comment" });
    }
});

