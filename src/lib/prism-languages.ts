import Prism from "prismjs";

// Core languages that others depend on
import "prismjs/components/prism-markup";
import "prismjs/components/prism-clike";

// Common languages
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";
import "prismjs/components/prism-java";
import "prismjs/components/prism-kotlin";
import "prismjs/components/prism-swift";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-csharp";

// Languages with dependencies (load after dependencies)
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-php";

// Add plaintext as an alias for text
if (!Prism.languages.plaintext) {
  Prism.languages.plaintext = {};
}

export default Prism;
