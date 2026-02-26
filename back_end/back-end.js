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

    return res.json({ message: "Login successful!" });
});

app.post("/logout", async (req, res) => {
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

router.post("/", (req, res) => {
    dal.pushRecipe(req);
    
    const response = {
        code: 200,
        message: "Recipe added",
    };
    
    return res.json(response);
});

router.delete("/", (req, res) => { 
    dal.deleteRecipe(req);

    const response = {
        code: 200,
        message: "Recipe deleted",
    };
    
    return res.json(response);
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