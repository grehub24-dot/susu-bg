require("dotenv").config({ override: true });
const app = require("./app");

const port = Number(process.env.PORT || 4000);

app.listen(port, () => {
  process.stdout.write(`Backend running on port ${port}\n`);
});
