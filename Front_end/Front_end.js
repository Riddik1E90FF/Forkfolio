const admin_emails = ["zachmajernik@gmail.com"];

const express = require('express');
const cookieparser = require('cookie-parser');

const app = express();
const port = 7000;

app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(cookieparser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const API_BASE = 'http://localhost:4000';

app.get('/api/recipes', async (req, res) => {
  try {
    const response = await fetch(`${API_BASE}/recipes`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }});

app.get('/api/recipes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await fetch(`${API_BASE}/recipes/${id}`);
    const recipe = await response.json();
    const useremail = req.cookies.user_email || null;
    const isAdmin = useremail && admin_emails.includes(useremail);
    const userId = req.cookies.user_id || null;
    const username = useremail ? useremail.split('@')[0] : 'Guest';
    res.render('recipe_details', { recipe, useremail, userid: req.cookies.user_id || null, username, isAdmin });
  } catch (error) {
    console.error('Error fetching recipe details:', error);
    res.status(500).json({ error: 'Failed to fetch recipe details' });
  }
});

app.get('/api/submitted_recipes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await fetch(`${API_BASE}/submitted_recipes/${id}`);
    const recipe = await response.json();
    const useremail = req.cookies.user_email || null;
    const isAdmin = useremail && admin_emails.includes(useremail);
    const userId = req.cookies.user_id || null;
    const username = useremail ? useremail.split('@')[0] : 'Guest';
    res.render('submitted_recipe_details', { recipe, useremail, userid: req.cookies.user_id || null, username, isAdmin });
  } catch (error) {
    console.error('Error fetching recipe details:', error);
    res.status(500).json({ error: 'Failed to fetch recipe details' });
  }
});

app.get('/login', (req, res) => {
    res.render('login', { error: null }); 
});

app.get('/signup', (req, res) => {
    res.render('signup', { error: null, message: null });
});

app.post('/recipes/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { comment, rating } = req.body;
  const userId = req.cookies.user_id || null;
  const username = req.cookies.user_email ? req.cookies.user_email.split('@')[0] : 'Guest';
  try {
    const response = await fetch(`${API_BASE}/recipes/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment, rating, username, userId, timestamp: new Date().toISOString() }),
    });
    if (response.ok) {
      return res.redirect(`/api/recipes/${id}`);
    } else {
      console.error('Error adding comment:', response.statusText);
      return res.status(500).send('Failed to add comment');
    }
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

app.delete('/recipes/:id/comments/:commentIdex', async (req, res) => {
  const { id, commentIdex } = req.params;
  const userId = req.cookies.user_id || null;
  const useremail = req.cookies.user_email || null;
  const isAdmin = useremail && admin_emails.includes(useremail);
  try {
    const response = await fetch(`${API_BASE}/recipes/${id}/comments/${commentIdex}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, isAdmin }),
    });

      res.json({ message: 'Comment deleted'});

  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

app.delete('/delete-recipe/:id', async (req, res) => {
  console.log("Received delete request for recipe with id:", req.params.id);
  const { id } = req.params;
  try {
    const response = await fetch(`${API_BASE}/delete-recipe/${id}`, { method: 'DELETE' });
    res.json({ message: 'Recipe deleted' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).send('Failed to delete recipe');
  }
});

app.delete('/delete-submitted-recipe/:id', async (req, res) => {
  console.log("Received delete request for submitted recipe with id:", req.params.id);
  const { id } = req.params;
  try {
    const response = await fetch(`${API_BASE}/delete-submitted-recipe/${id}`, { method: 'DELETE' });
    res.json({ message: 'Submitted recipe deleted' });
  } catch (error) {
    console.error('Error deleting submitted recipe:', error);
    res.status(500).send('Failed to delete submitted recipe');
  }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const response = await fetch('http://localhost:4000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            res.cookie('token', data.token, {httpOnly: true});
            res.cookie('user_email', data.user.email);
            res.cookie('user_id', data.user.id);
            res.redirect('/');
        } else {
            res.render('login', { error: data.error, message: null });
        }
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Server error', message: null });
    }
});

app.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    try {
        const response = await fetch('http://localhost:4000/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const data = await response.json();
            res.render('signup', { error: null, message: data.message || 'Account created!' });
        } else {
            const data = await response.json();
            res.render('signup', { error: data.error || 'Sign up failed', message: null });
        }
    } catch (err) {
        console.error(err);
        res.render('signup', { error: 'Server error', message: null });
    }
});

app.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.clearCookie('user_email');
    res.clearCookie('user_id');
    res.redirect('/login');
});

app.get('/', (req, res) => {
  const useremail = req.cookies.user_email || null;
  const isAdmin = useremail && admin_emails.includes(useremail);
  res.render('home', { useremail, isAdmin });
});

app.get('/recipe_list', async (req, res) => {
  const response = await fetch(`${API_BASE}/`);
  const recipes = await response.json();
  const useremail = req.cookies.user_email || null;
  const isAdmin = useremail && admin_emails.includes(useremail);
  res.render('recipe_list', { recipes, useremail, isAdmin });
});

app.get('/submitted_recipe_list', async (req, res) => {
  const response = await fetch(`${API_BASE}/submitted_recipes`);
  const recipes = await response.json();
  const useremail = req.cookies.user_email || null;
  const isAdmin = useremail && admin_emails.includes(useremail);
  res.render('submitted_recipe_list', { recipes, useremail, isAdmin });
});

app.get('/login', (req, res) => {
    res.render('login', { error: null, message: null }); 
});

app.post('/', async (req, res) => {
  const { name, ingredients, directions } = req.body;
  try {
    const response = await fetch(`${API_BASE}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ingredients, directions }),
    });
    if (response.ok) {
      res.redirect('/');
    } else {
      console.error('Error adding recipe:', response.statusText);
      res.status(500).send('Failed to add recipe');
    }
  } catch (error) {
    console.error('Error adding recipe:', error);
    res.status(500).send('Failed to add recipe');
  }
});

app.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, ingredients, directions } = req.body;
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ingredients, directions }),
    });
    if (response.ok) {
      res.json({ message: 'Recipe updated successfully' });
    } else {
      console.error('Error updating recipe: ', response.statusText);
      res.status(500).json({ error: 'Failed to update recipe' });
    }
  } catch (error) {
    console.error('Error updating recipe: ', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  } 
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

app.get("/search", async (req, res) => {
    const { q } = req.query;
    if (!q || !q.trim()) 
      return res.redirect('/recipe_list');

    const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
    const results = await response.json();
    const useremail = req.cookies.user_email || null;
    const isAdmin = useremail && admin_emails.includes(useremail);
    res.render('recipe_list', { recipes: results, useremail, isAdmin });
});