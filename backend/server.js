const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to the Meetup Backend API!');
});

app.listen(port, () => {
  console.log(`🚀 Server is running smoothly on http://localhost:${port}`);
});