// Imports
const express = require("express");
const router = express.Router();
const app = express();
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Supabase client
const SUPABASE_URL = "https://jxvpughnfytxfwcvsngk.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dnB1Z2huZnl0eGZ3Y3ZzbmdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTgzOTEsImV4cCI6MjA4NzUzNDM5MX0.nwviGkov8vWGdAhEj6RM0lpgRPEPLSf3rE2_C0FnDG8"; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Server variables
const { dal } = require("./data/DAL.js");
const PORT = 4000;

// Middleware
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "../Front_end/public")));

// Set up EJS as the view engine and configure views directory
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../Front_end/views"));

// Authentication routes for login
app.get("/login", (req, res) => {
    res.render("login", { error: null }); 
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const { error, data } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    return res.json({ 
        message: "Login successful!",
        user: data.user,
        token: data.session.access_token
    });
});

app.post("/logout", async (req, res) => {
    res.clearCookie('token');
    res.clearCookie('user_email');
    res.redirect("/login");
});

app.get("/session", async (req, res) => {
    if (req.session?.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

app.post("/signup", async (req, res) => {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    return res.json({ message: "Account created! Check your email." });
});

app.use("/", router);

app.listen(PORT, () => {
    console.log(`Express running on port ${PORT}`);
    console.log(`http://localhost:${PORT}/`);
});

router.get("/", async (req, res) => {
    const recipes = await dal.fetchAllRecipes();
    return res.json(recipes);
});

app.get("/searchByTag/:tag", async (req, res) => {
    const { tag } = req.params;
    const recipes = await dal.searchRecipesByTag(tag);
    return res.json(recipes);
});

router.get("/submitted_recipes", async (req, res) => {
    const recipes = await dal.fetchAllSubmittedRecipes();
    return res.json(recipes);
});

router.post("/", async (req, res) => {
    try {
        await dal.addRecipe(req.body);
        return res.json({ code: 200, message: "Recipe added" });
    } catch (error) {
        console.error("Error adding recipe: ", error);
        return res.status(500).json({ error: "Failed to add recipe" });
    }
});

// Delete a recipe by ID
router.delete("/delete-recipe/:id", async (req, res) => {
    console.log("recieved delete request for recipe with id:", req.params.id);
    const recipeId = req.params.id;
    try {
        const success = await dal.deleteRecipe(recipeId);
        if (success) {
            return res.json({ code: 200, message: "Recipe deleted" });
        } else {
            return res.status(404).json({ code: 404, message: "Recipe not found" });
        }
    } catch (error) {
        return res.status(500).json({ code: 500, message: "Error deleting recipe" });
    }
});

router.delete("/delete-submitted-recipe/:id", async (req, res) => {
    console.log("recieved delete request for submitted recipe with id:", req.params.id);
    const recipeId = req.params.id;
    try {
        const success = await dal.deleteSubmittedRecipe(recipeId);
        if (success) {
            return res.json({ code: 200, message: "Submitted recipe deleted" });
        } else {
            return res.status(404).json({ code: 404, message: "Submitted recipe not found" });
        }
    } catch (error) {
        return res.status(500).json({ code: 500, message: "Error deleting submitted recipe" });
    }
});

router.put("/", (req, res) => {
    dal.modifyPost(req);

    const response = {
        code: 200,
        message: "Recipe Edited",
    };

    return res.json(response);
});

router.get("/search", async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ error: "Search query is required" });
    }

    const results = await dal.searchRecipes(q);
    return res.json(results);
});


router.get("/recipes/:id", async (req, res) => {
    const recipe = await dal.fetchRecipeById(req.params.id);
    return res.json(recipe);
});

router.get("/submitted_recipes/:id", async (req, res) => {
    const recipe = await dal.fetchSubmittedRecipeById(req.params.id);
    return res.json(recipe);
});

// Accept a comment from the front end and forward it to the DAL
router.post("/recipes/:id/comments", async (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;
    const username = req.body.username || 'n/a';
    const rating = req.body.rating;
    const userId = req.body.userId || 'n/a';
    const timestamp = new Date().toISOString();

    const commentObj = {
        text: comment,
        rating,
        username,
        userId,
        timestamp,
    };

    try {
        await dal.addCommentToRecipe(id, commentObj);
        return res.json({ code: 200, message: "Comment added" });
    } catch (error) {
        console.error("Error adding comment: ", error);
        res.status(500).json({ error: "Failed to add comment" });
    }
});

router.delete("/recipes/:id/comments/:commentIndex", async (req, res) => {
    const { id, commentIndex } = req.params;
    const { userId, isAdmin } = req.body;
    try {
        await dal.deleteCommentFromRecipe(id, parseInt(commentIndex), userId, isAdmin);
        return res.json({ code: 200, message: "Comment deleted" });
    } catch (error) {
        console.error("Error deleting comment: ", error);
        res.status(500).json({ error: "Failed to delete comment" });
    }
});

router.post('/accept-submitted-recipe/:id', async (req, res) => {
    const {id}  = req.params;

    try {
        await dal.acceptSubmittedRecipe(id);
        return res.json({ code: 200, message: "Recipe accepted" });
    } catch (error) {
        console.error("Error adding recipe: ", error);
        res.status(500).json({ error: "Failed to accept recipe" });
    }
});

// Route to handle editing a submitted recipe
router.post('/edit-submitted-recipe/:id', async (req, res) => {
    const { id } = req.params;
    const updatedRecipe = req.body;
    if (typeof updatedRecipe.tags === 'string') {
        updatedRecipe.tags = updatedRecipe.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    try {
        const success = await dal.updateSubmittedRecipe(id, updatedRecipe);
        if (success) {
            return res.json({ message: 'Recipe updated' });
        } else {
            return res.status(404).json({ error: 'Recipe not found or not updated' });
        }
    } catch (error) {
        console.error('Error updating submitted recipe:', error);
        return res.status(500).json({ error: 'Failed to update submitted recipe' });
    }
});
router.post('/edit-recipe/:id', async (req, res) => {
    const { id } = req.params;
    const updatedRecipe = req.body;
    if (typeof updatedRecipe.tags === 'string') {
        updatedRecipe.tags = updatedRecipe.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    try {
        const success = await dal.updateRecipe(id, updatedRecipe);
        if (success) {
            return res.json({ message: 'Recipe updated' });
        } else {
            return res.status(404).json({ error: 'Recipe not found or not updated' });
        }
    } catch (error) {
        console.error('Error updating recipe:', error);
        return res.status(500).json({ error: 'Failed to update recipe' });
    }
});

router.post('/submit-recipe', async (req, res) => {
    const recipe = req.body;
    try {        
        await dal.addRecipe(recipe, true);
        return res.json({ message: 'Recipe submitted' });
    } catch (error) {
        console.error('Error submitting recipe:', error);
        return res.status(500).json({ error: 'Failed to submit recipe' });
    }
});