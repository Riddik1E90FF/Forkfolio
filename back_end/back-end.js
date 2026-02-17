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

