const express = require('express');

const app = express();
const port = 7000;

app.set('view engine', 'ejs');

app.use(express.static('public'));

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
    res.render('recipe_details', { recipe });
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
  try {
    const response = await fetch(`${API_BASE}/recipes/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment, rating }),
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

app.get('/', (req, res) => {
  res.render('home');
});

app.get('/recipe_list', async (req, res) => {
  const response = await fetch(`${API_BASE}/`);
  const recipes = await response.json();
  res.render('recipe_list', { recipes });
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

app.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      res.json({ message: 'Recipe deleted successfully' });
    } else {
      console.error('Error deleting recipe:', response.statusText);
      res.status(500).json({ error: 'Failed to delete recipe' });
    }
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
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
