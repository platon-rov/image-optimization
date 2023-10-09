import { Image } from "./Image";

import { config, fallbackImageUrl } from "./images";

function App() {
  return (
    <div className="App">
      <p>
        Check <pre>README.md</pre> for details
      </p>
      <Image sources={config} src={fallbackImageUrl} />
    </div>
  );
}

export default App;
