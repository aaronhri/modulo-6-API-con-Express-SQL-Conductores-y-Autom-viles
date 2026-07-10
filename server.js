const app = require('./app');
const port = 3000;

app.listen(port, () => {
  console.log(`Servidor Express corriendo exitosamente en http://localhost:${port}`);
});