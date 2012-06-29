# Makefile for Sphinx documentation
#

# You can set these variables from the command line.
SPHINXOPTS	  =
SPHINXBUILD	  = sphinx-build
PAPER		  =
BUILDDIR	  = _build
JAVASRCDIR	  = ../servers/java
JAVABUILDDIR  = ../servers/java/target/site/apidocs
DEPLOYDIR	  = swgtc@opencoweb.org:opencoweb.org/ocwdocs/

# Internal variables.
PAPEROPT_a4		= -D latex_paper_size=a4
PAPEROPT_letter = -D latex_paper_size=letter
ALLSPHINXOPTS	= -d $(BUILDDIR)/doctrees $(PAPEROPT_$(PAPER)) $(SPHINXOPTS) .

.PHONY: help clean html dirhtml singlehtml pickle json htmlhelp qthelp devhelp epub latex latexpdf text man changes linkcheck doctest deploy

help:
	@echo "Please use \`make <target>' where <target> is one of"
	@echo "	 deploy			to deploy HTML files to opencoweb.org"
	@echo "	 html			to make standalone HTML files"
	@echo "	 javadoc		to make Javadoc files using Maven"
	@echo "	 dirhtml		to make HTML files named index.html in directories"
	@echo "	 singlehtml		to make a single large HTML file"
	@echo "	 pickle			to make pickle files"
	@echo "	 json			to make JSON files"
	@echo "	 htmlhelp		to make HTML files and a HTML help project"
	@echo "	 qthelp			to make HTML files and a qthelp project"
	@echo "	 devhelp		to make HTML files and a Devhelp project"
	@echo "	 epub			to make an epub"
	@echo "	 latex			to make LaTeX files, you can set PAPER=a4 or PAPER=letter"
	@echo "	 latexpdf		to make LaTeX files and run them through pdflatex"
	@echo "	 text			to make text files"
	@echo "	 man			to make manual pages"
	@echo "	 changes		to make an overview of all changed/added/deprecated items"
	@echo "	 linkcheck		to check all external links for integrity"
	@echo "	 doctest		to run all doctests embedded in the documentation (if enabled)"
	@echo "	 wars			to make a deployable WAR files of the html and javadoc output"
	@echo "	 htmlwar		to make a deployable WAR files of the html output"
	@echo "	 javadocwar		to make a deployable WAR files of the javadoc output"

deploy: html javadoc
	rsync -rv $(BUILDDIR)/html/* $(DEPLOYDIR)
	rsync -rv $(JAVABUILDDIR)/* $(DEPLOYDIR)/apidocs
	@echo "Deployed docs to opencoweb.org/ocwdocs"

clean:
	-rm -rf $(BUILDDIR)/*

javadoc:
	cd $(JAVASRCDIR); mvn javadoc:aggregate
	@echo "Build finished. The Javadoc pages are in $(JAVABUILDDIR)"

html:
	$(SPHINXBUILD) -b html $(ALLSPHINXOPTS) $(BUILDDIR)/html
	@echo
	@echo "Build finished. The HTML pages are in $(BUILDDIR)/html."

dirhtml:
	$(SPHINXBUILD) -b dirhtml $(ALLSPHINXOPTS) $(BUILDDIR)/dirhtml
	@echo
	@echo "Build finished. The HTML pages are in $(BUILDDIR)/dirhtml."

singlehtml:
	$(SPHINXBUILD) -b singlehtml $(ALLSPHINXOPTS) $(BUILDDIR)/singlehtml
	@echo
	@echo "Build finished. The HTML page is in $(BUILDDIR)/singlehtml."

pickle:
	$(SPHINXBUILD) -b pickle $(ALLSPHINXOPTS) $(BUILDDIR)/pickle
	@echo
	@echo "Build finished; now you can process the pickle files."

json:
	$(SPHINXBUILD) -b json $(ALLSPHINXOPTS) $(BUILDDIR)/json
	@echo
	@echo "Build finished; now you can process the JSON files."

htmlhelp:
	$(SPHINXBUILD) -b htmlhelp $(ALLSPHINXOPTS) $(BUILDDIR)/htmlhelp
	@echo
	@echo "Build finished; now you can run HTML Help Workshop with the" \
		  ".hhp project file in $(BUILDDIR)/htmlhelp."

qthelp:
	$(SPHINXBUILD) -b qthelp $(ALLSPHINXOPTS) $(BUILDDIR)/qthelp
	@echo
	@echo "Build finished; now you can run "qcollectiongenerator" with the" \
		  ".qhcp project file in $(BUILDDIR)/qthelp, like this:"
	@echo "# qcollectiongenerator $(BUILDDIR)/qthelp/OpenCooperativeWebFramework.qhcp"
	@echo "To view the help file:"
	@echo "# assistant -collectionFile $(BUILDDIR)/qthelp/OpenCooperativeWebFramework.qhc"

devhelp:
	$(SPHINXBUILD) -b devhelp $(ALLSPHINXOPTS) $(BUILDDIR)/devhelp
	@echo
	@echo "Build finished."
	@echo "To view the help file:"
	@echo "# mkdir -p $$HOME/.local/share/devhelp/OpenCooperativeWebFramework"
	@echo "# ln -s $(BUILDDIR)/devhelp $$HOME/.local/share/devhelp/OpenCooperativeWebFramework"
	@echo "# devhelp"

epub:
	$(SPHINXBUILD) -b epub $(ALLSPHINXOPTS) $(BUILDDIR)/epub
	@echo
	@echo "Build finished. The epub file is in $(BUILDDIR)/epub."

latex:
	$(SPHINXBUILD) -b latex $(ALLSPHINXOPTS) $(BUILDDIR)/latex
	@echo
	@echo "Build finished; the LaTeX files are in $(BUILDDIR)/latex."
	@echo "Run \`make' in that directory to run these through (pdf)latex" \
		  "(use \`make latexpdf' here to do that automatically)."

latexpdf:
	$(SPHINXBUILD) -b latex $(ALLSPHINXOPTS) $(BUILDDIR)/latex
	@echo "Running LaTeX files through pdflatex..."
	make -C $(BUILDDIR)/latex all-pdf
	@echo "pdflatex finished; the PDF files are in $(BUILDDIR)/latex."

text:
	$(SPHINXBUILD) -b text $(ALLSPHINXOPTS) $(BUILDDIR)/text
	@echo
	@echo "Build finished. The text files are in $(BUILDDIR)/text."

man:
	$(SPHINXBUILD) -b man $(ALLSPHINXOPTS) $(BUILDDIR)/man
	@echo
	@echo "Build finished. The manual pages are in $(BUILDDIR)/man."

changes:
	$(SPHINXBUILD) -b changes $(ALLSPHINXOPTS) $(BUILDDIR)/changes
	@echo
	@echo "The overview file is in $(BUILDDIR)/changes."

linkcheck:
	$(SPHINXBUILD) -b linkcheck $(ALLSPHINXOPTS) $(BUILDDIR)/linkcheck
	@echo
	@echo "Link check complete; look for any errors in the above output " \
		  "or in $(BUILDDIR)/linkcheck/output.txt."

doctest:
	$(SPHINXBUILD) -b doctest $(ALLSPHINXOPTS) $(BUILDDIR)/doctest
	@echo "Testing of doctests in the sources finished, look at the " \
		  "results in $(BUILDDIR)/doctest/output.txt."


# Generate a deployable WAR of the OCW documentation.
OCWDOCS_WAR_DEPLOY = ./
JAVADOC_WEBXML_SRC = \
<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
<web-app xmlns=\"http://java.sun.com/xml/ns/javaee\"\n\
         xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\n\
         xsi:schemaLocation=\"http://java.sun.com/xml/ns/javaee http://java.sun.com/xml/ns/javaee/web-app_2_5.xsd\"\n\
         version=\"2.5\"\n\
         id=\"ocwdocs\">\n\
  <display-name>OCW Documentation</display-name>\n\
  <welcome-file-list>\n\
    <welcome-file>index.html</welcome-file>\n\
  </welcome-file-list>\n\
</web-app>
HTML_WEBXML_SRC = \
<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
<web-app xmlns=\"http://java.sun.com/xml/ns/javaee\"\n\
         xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\n\
         xsi:schemaLocation=\"http://java.sun.com/xml/ns/javaee http://java.sun.com/xml/ns/javaee/web-app_2_5.xsd\"\n\
         version=\"2.5\"\n\
         id=\"ocwdocs\">\n\
  <display-name>OCW Documentation</display-name>\n\
  <welcome-file-list>\n\
    <welcome-file>index.html</welcome-file>\n\
  </welcome-file-list>\n\
</web-app>

javadocwar:
	@$(eval OCWDOCS_TMPDIR :=$(shell mktemp -d -t pbs_docs_build))
	@cp -r $(JAVABUILDDIR)/* $(OCWDOCS_TMPDIR)
	@mkdir $(OCWDOCS_TMPDIR)/WEB-INF
	@echo "$(JAVADOC_WEBXML_SRC)" > $(OCWDOCS_TMPDIR)/WEB-INF/web.xml
	@cd $(OCWDOCS_TMPDIR);jar cf ocwjavadocs.war .;
	@mv $(OCWDOCS_TMPDIR)/ocwjavadocs.war $(OCWDOCS_WAR_DEPLOY)/
	@rm -r $(OCWDOCS_TMPDIR)
	@echo "Created $(OCWDOCS_WAR_DEPLOY)/ocwjavadocs.war"

htmlwar:
	@$(eval OCWDOCS_TMPDIR :=$(shell mktemp -d -t pbs_docs_build))
	@cp -r $(BUILDDIR)/html/* $(OCWDOCS_TMPDIR)
	@mkdir $(OCWDOCS_TMPDIR)/WEB-INF
	@echo "$(HTML_WEBXML_SRC)" > $(OCWDOCS_TMPDIR)/WEB-INF/web.xml
	@cd $(OCWDOCS_TMPDIR);jar cf ocwdocs.war .;
	@mv $(OCWDOCS_TMPDIR)/ocwdocs.war $(OCWDOCS_WAR_DEPLOY)/
	@rm -r $(OCWDOCS_TMPDIR)
	@echo "Created $(OCWDOCS_WAR_DEPLOY)/ocwdocs.war"

wars: htmlwar javadocwar
	@echo "Making WARS for html and javadocs."

