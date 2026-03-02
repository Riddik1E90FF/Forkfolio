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
    },
    deleteCommentFromRecipe: async function(recipeId, commentIndex, userId) {
        const client = new MongoClient(uri);
        try {
            await client.connect();
            const db = client.db("recipeApp");
            const coll = db.collection("recipes");
            const recipe =  await coll.findOne({ _id: new ObjectId(recipeId) });

            if (!recipe || !recipe.comments)
                throw new Error('Recipe not found');

            const comment = recipe.comments[commentIndex];
            if (!comment)
                throw new Error('Comment not found');
        if (comment.userId !== userId)
            throw new Error('Unauthorized');
        recipe.comments.splice(commentIndex, 1);
        await coll.updateOne(
            { _id: new ObjectId(recipeId) },
            { $set: { comments: recipe.comments } 
        });
        } finally {
            await client.close();
        }
    },
    searchRecipes: async function(query) {
        console.log("Searching recipes with query:", query);
        const client = new MongoClient(uri);
        let results = [];
        try {
            await client.connect();
            const db = client.db("recipeApp");
            const coll = db.collection("recipes");
            // Use a case-insensitive regex search on the name and ingredients fields
            results = await coll.find({
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { ingredients: { $regex: query, $options: 'i' } }
                ]
            }).toArray();
            console.log("Search results:", results);
        }
        catch (error) {
            console.error("Error searching recipes: ", error);
        }
        finally {
            await client.close();
        }
        return results;
    }
};

exports.dal = dal;