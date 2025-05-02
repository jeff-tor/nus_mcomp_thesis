# A LaTeX template for Capstone Report of the Master of Science in Precision Health and Medicine (MSc. PHM), National University of Singapore (NUS)

Special thanks to [Qian Lin](https://github.com/streamjoin) for the original template. This is a fork of the original template [streamjoin/nusthesis](https://github.com/streamjoin/nusthesis) with some modifications to suit the requirements of the MSc. PHM program.

This set of latex code (mainly the [`nusthesis.cls`](nusthesis.cls)) composes a template of NUS thesis, which is compliant with the [university's requirement](https://www.dropbox.com/s/o6jtrk9y7cil70w/General-Guidelines-and-Instructions-on-Format-of-Research-Thesis-and-Electronic-Submission.pdf "General Guidelines and Instructions on Format of Research Thesis and Electronic Submission").
Using this template to organize your thesis content can save a lot of effort spent in formatting. 

Additional modifications have been made to the original template to fits the requirements of the MSc. PHM program. The modifications include:
- Change the cover page to match the MSc. PHM program requirements.
- Add Declaration of AI Usage
- And other minor changes to the formatting and layout.

Apart from formatting, the example .tex files also include a lot of latex tricks extracted from Qian's years' experience of using latex.
These tricks are mainly described and demonstrated in the `chapters/ch-Intro.tex` file. 

You can get a quick overview of the template by looking at the [`main.pdf`](https://github.com/arnold117/nus_phm_thesis/blob/master/main.pdf) file, which is the compiled version of `main.tex`.

## Compilation

Run the `build.sh` script to compile in Linux, macOS or emulated Unix-like environment for Windows (e.g., [Cygwin](https://www.cygwin.com/) and [MinGW](http://www.mingw.org/ "Minimalist GNU for Windows")). ~~For compilation in the native Windows, run the `build.bat` script.~~ The produced .pdf file locates in the same folder. 

You may customize the name of the output .pdf file by configuring `PDF_NAME` in the above scripts. Alternatively, you could specify the filename with the `--pdf-name` option (or `-o` for short). For example, 

```sh
$ ./build.sh --pdf-name MyThesis
```

This will produce `MyThesis.pdf` as output.

ps: Since [Windows 10 already provides built-in Linux Bash Shell](https://www.howtogeek.com/249966/how-to-install-and-use-the-linux-bash-shell-on-windows-10/), the original crappy `build.bat` script has been deprecated. Nevertheless, you are still welcomed to provide a robust one via [pull request](https://github.com/streamjoin/nusthesis/pulls) if you believed that's really necessary.

### Manual Compilation 

In case you prefer to compile the code manually, please run *exactly* the following commands at the project root (i.e., where the `main.tex` locates at the same directory level).

```sh
$ pdflatex main.tex
$ biber main
$ pdflatex main.tex
$ pdflatex main.tex
```

Note that the parameter to `biber` is the filename *without extension*. Moreover, you must run the second `pdflatex` to generate bibliography and resolve citations, and the third `pdflatex` to generate the bibliography entry in the table of contents. 

### Dependencies 

- LaTeX ([MiKTeX](https://miktex.org/) or [TeX Live](https://www.tug.org/texlive/))
- [biber](http://biblatex-biber.sourceforge.net/ "Biber: A BibTeX replacement for users of BibLaTeX")

## Editing 

Your edit should start with [`main.tex`](main.tex), which is also the compilation entry (as configured in [`build.sh`](build.sh)). Sources of individual chapters as well as abstract, acknowledgments, appendices, etc., are placed in the [`chapters`](chapters/) folder. Illustrative figures and analytical plotting should be stored in the [`pic`](pic/) and [`exp`](exp/) folders respectively. 

### Printing vs. Electronic

Uncomment the following line at the head of `main.tex` when you are producing the thesis for printing hard copies in a **double-sided** fashion. 

```latex
\newcommand*{\DoubleSided}{}
```

And comment it out when you are producing the electronic thesis for the final submission. 

## Contact 

If you encounter any problem with this template, feel free to [contact me](mailto:yanuo.zhou@u.nus.edu) or [create an issue](https://github.com/arnold117/nus_phm_thesis/issues) in this repository. 

All the best for your graduation!
