const { MongoClient, ServerApiVersion } = require('mongodb');
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
            console.log("Database: recipeApp, Collection: recipes");
            recipes = await coll.find().toArray();
            console.log("Found " + recipes.length + " recipes");
            console.log("Recipes: ", recipes);
        }catch(error){
            console.error("Error fetching recipes: ", error);
        }finally{
            await client.close();
        }

        return recipes;
    }
};

exports.dal = dal;