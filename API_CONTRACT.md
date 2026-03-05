# Forkfolio API Contract

## Architecture

```
Browser (EJS pages)
    ↕  HTTP  port 7000
Front_end.js  (BFF — Backend for Frontend)
    ↕  HTTP  port 4000
back-end.js
    ↕
MongoDB  (recipes, submitted_recipes collections)
Supabase (authentication only)
```

The Front_end is a pass-through proxy. It never stores data — it reads cookies for auth context,
then forwards requests to the back-end and either renders a view or returns the JSON as-is.

---

## Data Models

### Recipe
Stored in MongoDB collection `recipes` (or `submitted_recipes` for pending submissions).

```json
{
  "_id": "ObjectId (MongoDB)",
  "name": "string",
  "description": "string",
  "estimatedTime": "string  e.g. '30 minutes'",
  "servings": "number",
  "difficulty": "string  e.g. 'Easy'",
  "tags": "string[]  or a comma-separated string",
  "ingredients": [
    { "item": "string", "amount": "string" }
  ],
  "directions": ["string"],
  "comments": ["Comment"]
}
```

### Comment
Embedded inside a Recipe document.

```json
{
  "text": "string",
  "rating": "number  0–5",
  "username": "string",
  "userId": "string  (Supabase user UUID)",
  "timestamp": "string  ISO 8601"
}
```

### Auth Token
Issued by Supabase on login, stored as `token` cookie by the Front_end.

```json
{
  "message": "string",
  "user": {
    "id": "string  (UUID)",
    "email": "string"
  },
  "token": "string  (JWT)"
}
```

---

## Layer 1: Browser → Front_end (port 7000)

The browser talks exclusively to port 7000. No browser request ever hits port 4000 directly.

### Auth state
Auth is tracked via three cookies set by the Front_end after a successful login:

| Cookie | Value |
|--------|-------|
| `token` | JWT from Supabase (httpOnly) |
| `user_email` | User's email address |
| `user_id` | Supabase user UUID |

Admin status is determined server-side by checking `user_email` against the `admin_emails` array
in `Front_end.js`. It is never stored in a cookie.

---

### Page Routes (render HTML)

| Method | Path | Query / Params | Renders | Notes |
|--------|------|----------------|---------|-------|
| GET | `/` | — | `home.ejs` | |
| GET | `/login` | — | `login.ejs` | |
| GET | `/signup` | — | `signup.ejs` | |
| GET | `/recipe_list` | — | `recipe_list.ejs` | |
| GET | `/submitted_recipe_list` | — | `submitted_recipe_list.ejs` | Admin only (enforced in UI via `isAdmin`) |
| GET | `/api/recipes/:id` | `:id` = MongoDB ObjectId | `recipe_details.ejs` | |
| GET | `/api/submitted_recipes/:id` | `:id` = MongoDB ObjectId | `submitted_recipe_details.ejs` | Admin only |
| GET | `/edit_recipe/:id` | `:id` = MongoDB ObjectId | `edit_recipe.ejs` | Admin only |
| GET | `/edit_submitted_recipe/:id` | `:id` = MongoDB ObjectId | `edit_recipe.ejs` | Admin only |
| GET | `/search` | `?q=string` | `recipe_list.ejs` | Redirects to `/recipe_list` if `q` is empty |

All page routes pass the following locals to every EJS template:

```js
{
  useremail: string | null,   // from cookie
  isAdmin:   boolean,         // derived server-side
  userid:    string | null,   // from cookie (page routes that need it)
  username:  string,          // email prefix, or 'Guest'
  recipes:   Recipe[],        // list routes only
  recipe:    Recipe           // detail/edit routes only
}
```

---

### JSON API Routes

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/recipes` | `Recipe[]` — all recipes |

---

### Action Routes (POST / PUT / DELETE)

These are called by HTML forms or JavaScript `fetch()` in the browser.

#### Auth

| Method | Path | Request Body | Success Response | Error Response |
|--------|------|-------------|-----------------|----------------|
| POST | `/login` | `{ email, password }` | Redirect to `/` + sets cookies | Re-renders `login.ejs` with `{ error }` |
| POST | `/signup` | `{ email, password }` | Re-renders `signup.ejs` with `{ message }` | Re-renders `signup.ejs` with `{ error }` |
| POST | `/logout` | — | Redirect to `/login`, clears all cookies | — |

#### Recipes

| Method | Path | Request Body | Success Response | Error Response |
|--------|------|-------------|-----------------|----------------|
| POST | `/` | `{ name, ingredients, directions }` | Redirect to `/` | `500` |
| POST | `/edit-recipe/:id` | Form body (see Edit body below) | Redirect to `/api/recipes/:id` | `500` plain text |
| PUT | `/:id` | `{ name, ingredients, directions }` | `200 { message }` JSON | `500 { error }` JSON |
| DELETE | `/delete-recipe/:id` | — | `200 { message }` JSON | `500` plain text |

#### Submitted Recipes

| Method | Path | Request Body | Success Response | Error Response |
|--------|------|-------------|-----------------|----------------|
| POST | `/edit-submitted-recipe/:id` | Form body (see Edit body below) | Redirect to `/api/submitted_recipes/:id` | `500` plain text |
| POST | `/accept-submitted-recipe/:id` | — | Redirect to `/submitted_recipe_list` | `500` plain text |
| DELETE | `/delete-submitted-recipe/:id` | — | `200 { message }` JSON | `500` plain text |

#### Comments

| Method | Path | Request Body | Success Response | Error Response |
|--------|------|-------------|-----------------|----------------|
| POST | `/recipes/:id/comments` | `{ comment, rating }` from form | Redirect to `/api/recipes/:id` | `500` |
| DELETE | `/recipes/:id/comments/:commentIndex` | — (cookies read server-side) | `200 { message }` JSON | `500 { error }` JSON |

> The comment DELETE has no browser-side body. The Front_end reads `user_id` and `user_email`
> from cookies and forwards `{ userId, isAdmin }` to the back-end itself.

#### Edit Form Body Shape
Submitted by `edit_recipe.ejs` via POST:

```
name=string
description=string
estimatedTime=string
servings=number
difficulty=string
tags=string  (comma-separated)
ingredients[0][item]=string
ingredients[0][amount]=string
...
directions[0]=string
...
```

---

## Layer 2: Front_end → Back-end (port 4000)

The back-end exposes a pure JSON API. It never renders HTML for the Front_end
(the EJS views and static files it configures are unused in the current flow).

---

### Auth Routes (Supabase-backed)

| Method | Path | Request Body | Success `200` | Error |
|--------|------|-------------|---------------|-------|
| POST | `/login` | `{ email, password }` | `{ message, user: { id, email, ... }, token }` | `400 { error }` |
| POST | `/signup` | `{ email, password }` | `{ message }` | `400 { error }` |

---

### Recipe Routes

| Method | Path | Request Body | Success `200` | Error |
|--------|------|-------------|---------------|-------|
| GET | `/` | — | `Recipe[]` | — |
| GET | `/recipes/:id` | — | `Recipe` | — |
| GET | `/search?q=string` | — | `Recipe[]` | `400 { error }` if `q` missing |
| POST | `/` | `Recipe` object (from form body) | `{ code: 200, message }` | `500 { error }` |
| POST | `/edit-recipe/:id` | Partial `Recipe` fields | `{ message }` | `404 { error }` / `500 { error }` |
| DELETE | `/delete-recipe/:id` | — | `{ code: 200, message }` | `404 { code, message }` / `500 { code, message }` |

---

### Submitted Recipe Routes

| Method | Path | Request Body | Success `200` | Error |
|--------|------|-------------|---------------|-------|
| GET | `/submitted_recipes` | — | `Recipe[]` | — |
| GET | `/submitted_recipes/:id` | — | `Recipe` | — |
| POST | `/accept-submitted-recipe/:id` | — | `{ code: 200, message }` | `500 { error }` |
| POST | `/edit-submitted-recipe/:id` | Partial `Recipe` fields | `{ message }` | `404 { error }` / `500 { error }` |
| DELETE | `/delete-submitted-recipe/:id` | — | `{ code: 200, message }` | `404 { code, message }` / `500 { code, message }` |

---

### Comment Routes

| Method | Path | Request Body | Success `200` | Error |
|--------|------|-------------|---------------|-------|
| POST | `/recipes/:id/comments` | `{ comment, rating, username, userId, timestamp }` | `{ code: 200, message }` | `500 { error }` |
| DELETE | `/recipes/:id/comments/:commentIndex` | `{ userId, isAdmin }` | `{ code: 200, message }` | `500 { error }` |

> `commentIndex` is the zero-based array position of the comment in `recipe.comments`.
> If `isAdmin` is `true`, the ownership check (`userId` must match comment author) is skipped.

---

## Layer 3: Back-end → Data

### MongoDB (`recipeApp` database)

| Collection | Used by |
|------------|---------|
| `recipes` | All recipe routes |
| `submitted_recipes` | All submitted recipe routes |

DAL functions:

| Function | Description |
|----------|-------------|
| `fetchAllRecipes()` | Returns all documents from `recipes` |
| `fetchAllSubmittedRecipes()` | Returns all documents from `submitted_recipes` |
| `fetchRecipeById(id)` | Finds one recipe by ObjectId |
| `fetchSubmittedRecipeById(id)` | Finds one submitted recipe by ObjectId |
| `addRecipe(recipeData)` | Inserts a new recipe document |
| `updateRecipe(id, updatedRecipe)` | `$set` update on a recipe by ObjectId |
| `deleteRecipe(id)` | Deletes one recipe by ObjectId |
| `acceptSubmittedRecipe(id)` | Fetches submitted recipe, deletes it from `submitted_recipes`, inserts into `recipes` |
| `updateSubmittedRecipe(id, updatedRecipe)` | `$set` update on a submitted recipe by ObjectId |
| `deleteSubmittedRecipe(id)` | Deletes one submitted recipe by ObjectId |
| `addCommentToRecipe(id, comment)` | `$push` comment object onto `recipe.comments` |
| `deleteCommentFromRecipe(id, index, userId, isAdmin)` | Splices comment by index; ownership enforced unless `isAdmin` |
| `searchRecipes(query)` | Case-insensitive regex search on `name` and `ingredients` fields |

### Supabase (auth only)

Supabase is used exclusively for `signInWithPassword` and `signUp`. No recipe data lives in Supabase.
