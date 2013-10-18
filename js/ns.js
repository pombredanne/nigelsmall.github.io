
function len(x) {
    try {
        return x.length;
    } catch (e) {
        return undefined;
    }
}

function bin(x) {
    return x.toString(2);
}

function cyc(p, q) {
    return p < 0 ?
           (p % q + q) % q :
           p % q;
}

function hex(x) {
    return x.toString(16);
}

function range(start, stop, step) {
    var out = [];
    if (step === undefined)
        step = 1;
    if (stop === undefined) {
        stop = start;
        start = 0;
    }
    for (var i = start; i < stop; i += step)
        out.push(i)
    return out;
}

function sign(x) {
    if (arguments[0] === undefined || arguments[0] === null)
        return arguments[0];
    if (x == 0)
        return 0;
    return x < 0 ? -1 : 1;
}

function type(x) {
    var m = /^\[object ([0-9A-Za-z_]+)\]$/.exec(Object.prototype.toString.call(x));
    if (m)
        return m[1];
}

function rarr(x, times) {
    var out = [];
    for (var i = 0; i < times; ++i)
        out.push(x)
    return out;
}

function rstr(x, times) {
    return rarr(x, times).join("");
}

/*
 * each(doc.body.children, function() { return this.tagName }, String.prototype.toLowerCase)
 *
 */
function each() {
    if (arguments[0] === undefined || arguments[0] === null)
        return arguments[0];
    var data = arguments[0],
        t = type(data)
        numArgs = arguments.length;
    if (t == "Array" || t == "HTMLCollection" || t == "NodeList") {
        for (var arg = 1; arg < numArgs; ++arg) {
            var out = [];
            for (var index = 0; index < data.length; ++index)
                out.push(arguments[arg].call(data[index], data[index], index, index));
            data = out;
        }
    } else if (t == "Boolean" || t == "Number" || t == "String") {
        for (var arg = 1; arg < numArgs; ++arg)
            data = arguments[arg].call(data, undefined, 0);
    } else {
        for (var arg = 1; arg < numArgs; ++arg) {
            var out = {}, index = 0;
            for (var key in data)
                out[key] = arguments[arg].call(data[key], data[key], key, index++);
            data = out;
        }
    }
    return data;
}

window.doc = window.document;

function id(x) {
    return doc.getElementById(x);
}

function tag(tagName, parent) {
    if (parent == null)
        parent = doc;
    return parent.getElementsByTagName(tagName);
}

if (doc.getElementsByClassName) {

    window.cls = function(classNames, parent) {
        if (parent == null)
            parent = doc;
        return parent.getElementsByClassName(classNames);
    }

} else {

    window.cls = function(classNames, parent) {
        if (parent == null)
            parent = doc;
        var patterns = each(classNames.trim().split(/\s+/), function() {
            return new RegExp("\\b" + classNames + "\\b");
        });
        var allElements = parent.getElementsByTagName("*"),
            elements = [];
        for (var i = 0; i < allElements.length; ++i) {
            var klass = allElements[i].getAttribute("class"),
                match = true;
            if (klass != null && klass.length >= 0) {
                for (var p = 0; p < patterns.length; ++p) {
                    if (!patterns[p].test(klass))
                        match = false;
                        break;
                }
                if (match)
                    elements.push(allElements[i]);
            }
        }
        return elements;
    }

}

/*
 * Create a text node
 * (alias for document.createTextNode)
 */
function text(t) {
    return doc.createTextNode(t)
}

function elem(tag, attrs) {
    var e = doc.createElement(tag);
    for (var key in attrs)
        e.setAttribute(key, attrs[key]);
    return e;
}

function build(obj, cls) {
    var attrs = (cls === undefined) ? {} : {"class": cls};
    if (type(obj) == "Object") {
        var e = elem("div", attrs);
        for (var key in obj)
            e.put(build(obj[key], key));
        return e;
    } else if (type(obj) == "Array") {
        var e = elem("ol", attrs);
        for (var i = 0; i < obj.length; ++i) {
            var li = elem("li");
            li.put(build(obj[i]));
            e.put(li)
        }
        return e;
    } else {
        var e = elem("span", attrs);
        e.write(obj)
        return e;
    }
}

function put() {
    var parent = (this === window) ? doc.body : this;
    for (var i = 0; i < arguments.length; ++i)
        parent.appendChild(arguments[i]);
}
Element.prototype.put = put;

function clear() {
    while (this.firstChild)
        this.removeChild(this.firstChild);
}
Element.prototype.clear = clear;

function write() {
    for (var i = 0; i < arguments.length; ++i)
        put.call(this, text(arguments[i]));
}
Element.prototype.write = write;

function writeln() {
    write.apply(this, arguments);
    put.call(this, elem("br"));
}
Element.prototype.writeln = writeln;

function walk(f) {
    var obj = (this === window) ? doc.documentElement : this;
    f.call(obj);
    if("children" in obj) {
        for(var i = 0; i < obj.children.length; ++i)
            obj.children[i].walk(f);
    }
}
Element.prototype.walk = walk;

function hasClass(x) {
    var elements = cls(x, this.parentElement);
    for (var i = 0; i < elements.length; ++i) {
        if (elements[i] === this)
            return true;
    }
    return false;
}
Element.prototype.hasClass = hasClass;

function code(element) {

    var CYPHER_CHUNKS = /(\\\\|\/\*|\*\/|\/\/|\\"|"|\\'|'|\\`|`|\{[0-9A-Z_]+\}|\r|\n)/gim,
        CYPHER_TOKENS = /(create unique|is not|order by|[A-Z_][0-9A-Z_]*|={3,}|0\.[0-9]+|0|-?[1-9][0-9]*\.[0-9]+|-?[1-9][0-9]*|<?--+>?|<?-+\[|\]-+>?)/gi,
        CYPHER_VOCAB  = {
            "constant" : /^(true|false|null)$/i,
            "function" : /^(abs|any|all|avg|coalesce|collect|count|extract|filter|foreach|has|head|id|last|left|length|lower|ltrim|max|min|node|nodes|none|not|percentile_cont|percentile_disc|range|reduce|rel|relationship|relationships|replace|right|round|rtrim|shortestPath|sign|single|sqrt|str|substring|sum|tail|trim|type|upper)$/i,
            "keyword"  : /^(and|as|asc|create unique|create|delete|desc|distinct|in|is|is not|limit|match|or|order by|relate|return|set|skip|start|unique|where|with|={3,})$/i,
            "number"   : /^(0\.[0-9]+|0|-?[1-9][0-9]*\.[0-9]+|-?[1-9][0-9]*)$/,
            "pattern"  : /^(<?--+>?|<?-+\[|\]-+>?)$/
        },

        PYTHON_CHUNKS = /(\\\\|#|\\"|"""|"|\\'|'''|'|\r|\n)/gm,
        PYTHON_TOKENS = /(@?[A-Z_][0-9A-Z_]*|0\.[0-9]+j?|0j?|-?[1-9][0-9]*\.[0-9]+j?|-?[1-9][0-9]*j?)/gi,
        PYTHON_VOCAB  = {
            "constant" : /^(False|None|True)$/,
            "function" : /^(abs|all|any|ascii|bin|bool|bytearray|bytes|callable|chr|@?classmethod|compile|complex|delattr|dict|dir|divmod|enumerate|eval|exec|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|isinstance|issubclass|iter|len|list|locals|map|max|memoryview|min|next|object|oct|open|ord|pow|print|@?property|range|repr|reversed|round|set|setattr|slice|sorted|@?staticmethod|str|sum|super|tuple|type|vars|zip|__import__)$/,
            "keyword"  : /^(and|as|assert|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)$/
        },

        EOL = /\r|\n|\r\n/m,

        COMMENT_SPAN   = '<span class="comment">',
        ESCAPED_SPAN   = '<span class="escaped">',
        PARAMETER_SPAN = '<span class="parameter">',
        STRING_SPAN    = '<span class="string">',
        END_SPAN       = '</span>';

    /*
     * Push all arguments (except the first) onto the array passed
     * as the first argument.
     */
    function push() {
        var args = Array.prototype.slice.call(arguments),
            array = args.shift();
        while (args.length > 0)
            array.push(args.shift());
    }

    /*
     * Repeatedly shift items from start of array `source` and push
     * onto end of array `sink`; end when marker `end` is found or when
     * `source` is empty, returning true or false respectively.
     */
    function shiftPushUntil(source, sink, end) {
        if (type(end) == "RegExp")
            var stop = function(x) {
                return x.match(end);
            }
        else
            var stop = function(x) {
                return x == end;
            }
        while (source.length > 0) {
            var x = source.shift();
            sink.push(x);
            if (stop(x))
                return true;
        }
        return false;
    }

    /*
     * Continue feeding tokens from source to sink according to
     * specification in `span` which holds a 2-tuple of
     * (span_tag, end_marker). For example:
     *
     * (STRING_SPAN, '"')
     *
     */
    function continueSpan(span, source, sink) {
        var complete = shiftPushUntil(source, sink, span[1]);
        sink.push(END_SPAN);
        return complete ? null : span;
    }

    function CypherHighlighter() {

        var span = null;

        this.highlight = function(source) {
            var sink = [], token;
            source = source.split(CYPHER_CHUNKS);
            if (span) {
                sink.push(span[0]);
                span = continueSpan(span, source, sink);
            }
            while (source.length > 0) {
                token = source.shift();
                if (token == "//") {
                    push(sink, COMMENT_SPAN, token);
                    span = continueSpan([COMMENT_SPAN, EOL], source, sink);
                } else if (token == "'" || token == '"') {
                    push(sink, STRING_SPAN, token);
                    span = continueSpan([STRING_SPAN, token], source, sink);
                } else if (token == "`") {
                    push(sink, ESCAPED_SPAN, token);
                    span = continueSpan([ESCAPED_SPAN, token], source, sink);
                } else if (token[0] == "{") {
                    push(sink, PARAMETER_SPAN, token, END_SPAN);
                } else {
                    each(token.split(CYPHER_TOKENS), function() {
                        for(var key in CYPHER_VOCAB) {
                            if (CYPHER_VOCAB[key].test(this)) {
                                push(sink, '<span class="', key, '">', this, END_SPAN);
                                return;
                            }
                        }
                        sink.push(this);
                    });
                }
            }
            return sink.join("");
        }

    }

    function PythonHighlighter() {
        var endMarker = "",
            z = /(#|\\"|"""|"|\\'|'''|'|\\\\|\r|\n)/gm,
            no = /^(0\.[0-9]+j?|0j?|-?[1-9][0-9]*\.[0-9]+j?|-?[1-9][0-9]*j?)$/gim,
            kw = /^(False|None|True|and|as|assert|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)$/,
            fn = /^(abs|all|any|ascii|bin|bool|bytearray|bytes|callable|chr|@?classmethod|compile|complex|delattr|dict|dir|divmod|enumerate|eval|exec|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|isinstance|issubclass|iter|len|list|locals|map|max|memoryview|min|next|object|oct|open|ord|pow|print|@?property|range|repr|reversed|round|set|setattr|slice|sorted|@?staticmethod|str|sum|super|tuple|type|vars|zip|__import__)$/;
        this.highlight = function(code) {
            var out = [];
            if (endMarker != "")
                out.push('<span class="string">');
            code = code.split(z);
            while (code.length > 0) {
                var c = code.shift();
                if (endMarker != "") {
                    out.push(c);
                    if (c == endMarker) {
                        out.push('</span>');
                        endMarker = "";
                    }
                } else if (c == "#") {
                    out.push('<span class="comment">');
                    out.push(c);
                    while (code.length > 0 && code[0] != "\r" && code[0] != "\n")
                        out.push(code.shift());
                    out.push(code.shift());
                    out.push('</span>');
                } else if (c[0] == "'" | c[0] == '"') {
                    out.push('<span class="string">');
                    out.push(c);
                    endMarker = c;
                } else {
                    c = c.split(/(@?[A-Z_][0-9A-Z_]*|0\.[0-9]+j?|0j?|-?[1-9][0-9]*\.[0-9]+j?|-?[1-9][0-9]*j?)/gim);
                    var decl = false;
                    while (c.length > 0) {
                        var d = c.shift();
                        if (d.trim() != "" && decl) {
                            out.push('<span class="declaration">');
                            out.push(d);
                            out.push('</span>');
                            decl = false;
                        } else if (no.test(d)) {
                            out.push('<span class="number">');
                            out.push(d);
                            out.push('</span>');
                        } else if (kw.test(d)) {
                            out.push('<span class="keyword">');
                            out.push(d);
                            out.push('</span>');
                            if (d == "class" || d == "def") decl = true;
                        } else if (fn.test(d)) {
                            out.push('<span class="function">');
                            out.push(d);
                            out.push('</span>');
                        } else {
                            out.push(d)
                        }
                    }
                }
            }
            if (endMarker != "")
                out.push('</span>');
            return out.join("");
        }
    }

    function JavaScriptHighlighter() {
        var s = "",
            z = /(\\"|"|\\'|'|\/\*|\*\/|\/\/|\\\/|\/|\\\\|\r|\n)/gm,
            no = /^(0\.[0-9]+|0|-?[1-9][0-9]*\.[0-9]+|-?[1-9][0-9]*)$/gim,
            kw = /^(break|case|catch|class|continue|const|debugger|default|delete|do|else|enum|export|extends|finally|for|function|if|implements|import|in|instanceof|interface|let|new|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)$/,
            fn = /^(abs)$/;
        this.highlight = function(code) {
            var out = [];
            if (s != "")
                out.push('<span class="string">');
            code = code.split(z);
            while (code.length > 0) {
                var c = code.shift();
                if (s != "") {
                    out.push(c);
                    if (c == s) {
                        out.push('</span>');
                        s = "";
                    }
                } else {
                    if (c == "//") {
                        out.push('<span class="comment">');
                        out.push(c);
                        while (code.length > 0 && code[0] != "\r" && code[0] != "\n")
                            out.push(code.shift());
                        out.push(code.shift());
                        out.push('</span>');
                    } else if (c == "/*") {
                        out.push('<span class="comment">');
                        out.push(c);
                        s = "*/";
                    } else if (c == "'" | c == '"' | c == "/") {
                        out.push('<span class="string">');
                        out.push(c);
                        s = c;
                    } else {
                        c = c.split(/(@?[A-Z_][0-9A-Z_]*|0\.[0-9]+|0|-?[1-9][0-9]*\.[0-9]+|-?[1-9][0-9]*)/gim);
                        while (c.length > 0) {
                            var d = c.shift();
                            if (no.test(d)) {
                                out.push('<span class="number">');
                                out.push(d);
                                out.push('</span>');
                            } else if (kw.test(d)) {
                                out.push('<span class="keyword">');
                                out.push(d);
                                out.push('</span>');
                            } else if (fn.test(d)) {
                                out.push('<span class="function">');
                                out.push(d);
                                out.push('</span>');
                            } else {
                                out.push(d)
                            }
                        }
                    }
                }
            }
            if (s != "") {
                out.push('</span>');
            }
            return out.join("");
        }
    }

    var cypher = new CypherHighlighter(),
        python = new PythonHighlighter();

    function highlight() {
        if (this.tagName != "CODE")
            return;
        if (this.hasClass("language-cypher"))
            this.innerHTML = cypher.highlight(this.textContent);
        else if (this.hasClass("language-python"))
            this.innerHTML = python.highlight(this.textContent);
    }

    highlight.call(element);
    each(tag("code", element), highlight);

}

/*
 * test(function, returns, whenGiven)
 */
function test() {
    var args = Array.prototype.slice.call(arguments),
        func = args.shift(),
        expected = args.shift();
    var argsText = [];
    for (var i = 0; i < args.length; ++i) {
        try {
            argsText.push(JSON.stringify(args[i]));
        } catch (e) {
            argsText.push("" + args[i]);
        }
    }
    var result = {"function": func.name, "arguments": argsText.join(",")};
    result["actual"] = func.apply(undefined, args);
    if (type(expected) == "Function") {
        result["pass"] = expected(result["actual"]);
    } else if (result["actual"] == expected || (result["actual"] === NaN && expected === NaN)) {
        result["pass"] = true;
    } else {
        result["pass"] = false;
    }
    return build(result, "result");
}

function tests() {
    var argss = Array.prototype.slice.call(arguments),
        func = argss.shift();
    var results = elem("div", {"class": "results"});
    results.put(
        build("function", "header"),
        build("arguments", "header"),
        build("result", "header"),
        build("pass", "header")
    );
    for (var i = 0; i < argss.length; ++i) {
        var args = argss[i];
        args.unshift(func);
        results.put(test.apply(null, args));
    }
    return results;
}
