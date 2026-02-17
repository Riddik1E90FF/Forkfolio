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

app.get('/', (req, res) => {
  res.render('home');
});

app.get('/recipe_list', async (req, res) => {
  const response = await fetch(`${API_BASE}/`);
  const recipes = await response.json();
  res.render('recipe_list', { recipes });
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
