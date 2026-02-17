// Imports
const express = require("express");
const router = express.Router();

// Server variables
const {dal} = require("./data/DAL.js");
const PORT = 4000;

router.get("/recipes", async (req, res) => {
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