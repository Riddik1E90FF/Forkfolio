const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://zachmajernik_db_user:div08GzII37OFhg9@recipeapp-dev.g79enei.mongodb.net/?appName=recipeapp-dev";

let dal = {
    fetchAllRecipes: async function(){
        console.log("get all recipes from MongoDB");

        const client = new MongoClient(uri);
        let recipes = [];

        try{
            await client.connect();
            console.log("Connected to MongoDB");
            let db = client.db("recipeApp");
            let coll = db.collection("recipes");
            recipes = await coll.find().toArray();
            console.log("Found " + recipes.length + " recipes");
            console.log("Recipes: ", recipes);
        }catch(error){
            console.error("Error fetching recipes: ", error);
        }finally{
            await client.close();
        }

        return recipes;
    },
        fetchRecipeById: async function(id){
        console.log("Fetching recipe with id:", id); 
        const client = new MongoClient(uri);
        let recipe = null;
        try{
            await client.connect();
            let db = client.db("recipeApp");
            let coll = db.collection("recipes");
            recipe = await coll.findOne({ _id: new ObjectId(id) });
            console.log("Result:", recipe); 
        }catch(error){
            console.error("Error fetching recipe: ", error);
        }finally{
            await client.close();
        }
        return recipe;
    },
    addCommentToRecipe: async function(id, comment) {
        // comment is expected to be an object with at least { text, username, userId, timestamp, rating }
        console.log("Adding comment to recipe", id, comment);
        const client = new MongoClient(uri);
        try {
            await client.connect();
            const db = client.db("recipeApp");
            const coll = db.collection("recipes");
            // Push both the comment and the rating (as a number) to their respective arrays
            await coll.updateOne(
                { _id: new ObjectId(id) },
                {
                    $push: {
                        comments: comment,
                        ratings: Number(comment.rating)
                    }
                }
            );
            console.log("Comment and rating pushed");
        } catch (error) {
            console.error("Error adding comment: ", error);
            throw error;
        } finally {
            await client.close();
        }
    }
};

exports.dal = dal;