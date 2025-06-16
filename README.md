# NUS MSc. PHM Capstone Report LaTeX Template

A comprehensive LaTeX template for the **Master of Science in Precision Health and Medicine (MSc. PHM)** capstone reports at the **National University of Singapore (NUS)**.

## ✨ Features

- **Compliant formatting** with NUS thesis requirements
- **MSc. PHM specific modifications** including:
  - Customized cover page for capstone reports
  - Declaration of AI usage (required for modern academic integrity)
  - Research attachment period specification
  - Academic/Industrial report type selection
- **Professional styling** with proper typography and spacing
- **Comprehensive examples** including figures, tables, algorithms, and citations
- **Automated compilation** with build scripts
- **Cross-platform support** (Linux, macOS, Windows)

## 🚀 Quick Start

1. **Clone this repository**
   ```bash
   git clone https://github.com/arnold117/nus_phm_thesis.git
   cd nus_phm_thesis
   ```

2. **Edit the main content**
   - Modify [`main.tex`](main.tex) with your thesis details
   - Add your chapters in the [`chapters/`](chapters/) folder
   - Place figures in [`pic/`](pic/) and experimental plots in [`exp/`](exp/)

3. **Compile your thesis**
   ```bash
   ./build.sh
   ```

## 📁 Project Structure

```
├── main.tex                    # Main document entry point
├── nusthesis.cls              # NUS thesis document class
├── _global_settings.tex       # Global packages and configurations
├── references.bib             # Bibliography database
├── build.sh                   # Compilation script
├── chapters/                  # Individual chapter files
│   ├── abstract.tex
│   ├── acknowledgments.tex
│   ├── ch-intro.tex
│   ├── ch-review.tex
│   └── ...
├── pic/                       # Figures and images
├── exp/                       # Experimental plots and data
└── fairy-lite/               # LaTeX compilation utilities
```

## 🔧 Compilation

### Automated Build (Recommended)

```bash
# Default compilation
./build.sh

# Custom output filename
./build.sh --pdf-name "MyCapstoneReport"

# Clean build files
./build.sh --clean
```

### Manual Compilation

If you prefer manual control:

```bash
pdflatex main.tex
biber main
pdflatex main.tex
pdflatex main.tex
```

**Note**: The bibliography compilation requires `biber` (not `bibtex`), and multiple LaTeX runs are necessary for proper cross-references and bibliography generation.

## ✏️ Customization

### Essential Information

Edit the following in [`main.tex`](main.tex):

```latex
\title{Your Capstone Title}
\author{Your Name}
\nusid{A1234567X}
\supervisor{Your Supervisor Name \\ Department/Institution}
\startdate{Start Date}
\enddate{End Date}
\typeofReport{Academic} % or Industrial
\AIVersion{ChatGPT (OpenAI, GPT-4)} % Specify AI tools used
```

### Print vs. Electronic Version

For **double-sided printing**, uncomment this line in [`main.tex`](main.tex):
```latex
\newcommand*{\DoubleSided}{}
```

For **electronic submission** (default), keep it commented out.

## 📖 Writing Guide

### Chapter Organization
- **Introduction**: [`chapters/ch-intro.tex`](chapters/ch-intro.tex) - Contains LaTeX tips and tricks
- **Literature Review**: [`chapters/ch-review.tex`](chapters/ch-review.tex)
- **Main Content**: Add your research chapters following the example structure
- **Conclusion**: [`chapters/ch-concl.tex`](chapters/ch-concl.tex)

### Figures and Tables
- Use `\SetPicSubDir{folder-name}` to organize figures by chapter
- Use `\Pic{extension}{filename}` for figures: `\includegraphics{\Pic{pdf}{my-figure}}`
- Use `\Exp{extension}{filename}` for experimental plots

### Citations and References
- Add references to [`references.bib`](references.bib)
- Use `\cite{key}` for citations and `\citet{key}` for author-year format
- Bibliography is automatically generated using IEEE style

## 🛠️ Dependencies

### Required Software
- **LaTeX Distribution**: [TeX Live](https://www.tug.org/texlive/) (recommended) or [MiKTeX](https://miktex.org/)
- **Bibliography Tool**: [biber](http://biblatex-biber.sourceforge.net/)
- **Build Environment**: Bash shell (built-in on Linux/macOS, WSL/Git Bash on Windows)

### LaTeX Packages
All required packages are automatically loaded. Key packages include:
- `biblatex` with IEEE style for references
- `algorithm2e` for pseudocode
- `hyperref` for cross-references and links
- `graphicx` for figures
- And many more (see [`_global_settings.tex`](_global_settings.tex))

## 🐳 Development Container (Optional)

For a consistent development environment:

```bash
# Using VS Code with Docker
code .
# Select "Reopen in Container" when prompted
```

The [`.devcontainer/`](.devcontainer/) setup provides a complete LaTeX environment with VS Code extensions.

## 📋 Examples Included

This template includes comprehensive examples:
- **Algorithm pseudocode** with proper formatting
- **Mathematical equations** and notation
- **Figure and table placement** with captions
- **Cross-referencing** system
- **Citation styles** for different source types
- **Appendices** structure

## 🤝 Contributing

Found an issue or have an improvement? 
- [Create an issue](https://github.com/arnold117/nus_phm_thesis/issues)
- Submit a pull request
- [Contact the maintainer](mailto:yanuo.zhou@u.nus.edu)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### License Compatibility

This template is derived from the original [nusthesis template](https://github.com/streamjoin/nusthesis) by Qian Lin, which is also under MIT License. The MIT License ensures maximum compatibility and ease of use for academic and research purposes.

## 🙏 Acknowledgments

Special thanks to [Qian Lin](https://github.com/streamjoin) for the original [nusthesis template](https://github.com/streamjoin/nusthesis). This template has been adapted and enhanced specifically for the MSc. PHM program requirements.

---

**Good luck with your capstone report! 🎓**