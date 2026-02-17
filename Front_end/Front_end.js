const express = require('express');

const app = express();
const port = 7000;

app.set('view engine', 'ejs');

app.use(express.static('public'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('home');
});

app.get('/recipe', (req, res) => {
  res.render('recipe');
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});