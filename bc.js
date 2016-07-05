#!/usr/bin/env node
/// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/// @Copyright ~2016 ☜Samlv9☞ and other contributors
/// @MIT-LICENSE | 1.0.0 | http://apidev.guless.com/
/// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
///                                              }|
///                                              }|
///                                              }|     　 へ　　　 ／|    
///      _______     _______         ______      }|      /　│　　 ／ ／
///     /  ___  |   |_   __ \      .' ____ '.    }|     │　Z ＿,＜　／　　 /`ヽ
///    |  (__ \_|     | |__) |     | (____) |    }|     │　　　　　ヽ　　 /　　〉
///     '.___`-.      |  __ /      '_.____. |    }|      Y　　　　　`　 /　　/
///    |`\____) |    _| |  \ \_    | \____| |    }|    ｲ●　､　●　　⊂⊃〈　　/
///    |_______.'   |____| |___|    \______,'    }|    ()　 v　　　　|　＼〈
///    |=========================================\|    　>ｰ ､_　 ィ　 │ ／／
///    |> LESS IS MORE                           ||     / へ　　 /　ﾉ＜|＼＼
///    `=========================================/|    ヽ_ﾉ　　(_／　 │／／
///                                              }|     7　　　　　　  |／
///                                              }|     ＞―r￣￣`ｰ―＿`
///                                              }|
///                                              }|
/// Permission is hereby granted, free of charge, to any person obtaining a copy
/// of this software and associated documentation files (the "Software"), to deal
/// in the Software without restriction, including without limitation the rights
/// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
/// copies of the Software, and to permit persons to whom the Software is
/// furnished to do so, subject to the following conditions:
///
/// The above copyright notice and this permission notice shall be included in all
/// copies or substantial portions of the Software.
///
/// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
/// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
/// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
/// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
/// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
/// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
/// THE SOFTWARE.
var fs       = require("fs");
var path     = require("path");
var yargs    = require("yargs");
var Molder   = require("mold-source-map");
var mkdirp   = require("mkdirp");
var through  = require("through");
var exorcist = require("exorcist");
var UglifyJS = require("uglify-js");
var compiler = require(".");
var color    = require("cli-color");
var hrtime   = process.hrtime();
var argv     = yargs
             . usage ("Usage: bc -e <file> [-o \"file\"] [-s]")
             . option("e", { type: "string" , demand: true , describe: "应用程序入口点" })
             . option("o", { type: "string" , demand: false, describe: "编译结果输出位置(默认将编译结果输出至控制台)" })
             . option("s", { type: "boolean", demand: false, describe: "是否生成 sourcemaps 文件" })
             . option("m", { type: "boolean", demand: false, describe: "是否生成压缩 JS 文件" })
             . option("q", { type: "boolean", demand: false, describe: "是否启用安静模式" })
             . example("$0 -e main.js", "将编译结果输出至控制台")
             . example("$0 -s -e main.js -o bundle.js", "生成 sourcemaps 文件并压缩源文件")
             . alias("e", "entry"     )
             . alias("o", "output"    )
             . alias("s", "sourcemaps")
             . alias("m", "minify"    )
             . alias("q", "quiet"     )
             . alias("?", "help"      )
             . help ("?")
             . argv;
             
/// UglifyJS:compress 配置参数。
var compress = {
    drop_debugger: false,
    drop_console : false
};
             
/// 防止输出目录不存在。
if ( argv.output ) {
    mkdirp(path.dirname(argv.output));
}

var stream = compiler(argv.entry, { debug: argv.sourcemaps });
var output = argv.output ? fs.createWriteStream(argv.output) : process.stdout;

if ( argv.sourcemaps ) {
    /// 获取 sourcemaps 保存路径。
    var mapUrl = "";
    
    if ( argv.output ) {
        mapUrl = path.join(path.dirname(argv.output), path.basename(argv.output) + ".map");
    }
}

if ( argv.minify ) {
    /// 生成压缩版的 JS 文件。
    if ( mapUrl ) {
        stream.pipe(exorcist2(mapUrl)).pipe(output);
    }
    
    else {
        stream.pipe(minify()).pipe(output);
    }
}

else {
    if ( mapUrl ) {
        stream.pipe(exorcist(mapUrl)).pipe(output);
    }
    
    else {
        stream.pipe(output);
    }
}

if ( !argv.quiet ) {
    hrtime = process.hrtime(hrtime);
    console.log(color.green("compiler: " + (hrtime[0] + hrtime[1] / 1e9).toFixed(3) + "s"));
}

/// https://github.com/thlorenz/exorcist/blob/master/index.js
function separate(src, file, root, base, url) {
    src.sourceRoot(root || '');
    
    if (base) {
        src.mapSources(Molder.mapPathRelativeTo(base));
    }

    var json = src.toJSON(2);

    url = url || path.basename(file);

    var comment = '';
    var commentRx = /^\s*\/(\/|\*)[@#]\s+sourceMappingURL/mg;
    var commentMatch = commentRx.exec(src.source);
    var commentBlock = (commentMatch && commentMatch[1] === '*');

    if (commentBlock) {
        comment = '/*# sourceMappingURL=' + url + ' */';
    } else {
        comment = '//# sourceMappingURL=' + url;
    }

    return { json: json, comment: comment }
}

/**
 *
 * Externalizes the source map of the file streamed in.
 *
 * The source map is written as JSON to `file`, and the original file is streamed out with its
 * `sourceMappingURL` set to the path of `file` (or to the value of `url`).
 *
 * #### Events (in addition to stream events)
 *
 * - `missing-map` emitted if no map was found in the stream and errorOnMissing is falsey
 *   (the src is still piped through in this case, but no map file is written)
 *
 * @name exorcist
 * @function
 * @param {String} file full path to the map file to which to write the extracted source map
 * @param {String=} url full URL to the map file, set as `sourceMappingURL` in the streaming output (default: file)
 * @param {String=} root root URL for loading relative source paths, set as `sourceRoot` in the source map (default: '')
 * @param {String=} base base path for calculating relative source paths (default: use absolute paths)
 * @param {Boolean=} errorOnMissing when truthy, causes 'error' to be emitted instead of 'missing-map' if no map was found in the stream (default: falsey)
 * @return {TransformStream} transform stream into which to pipe the code containing the source map
 */
function exorcist2( file, url, root, base ) {
    var chunks = [];
    var source = "";
    var splits = null;
    var molder = null;
    var result = null;
    
    return through(function write( data ) {chunks.push(data);}, function done() {
        source = chunks.join("");
        
        if ( !file ) {
            this.queue(UglifyJS.minify(source, { fromString: true, compress: compress }).code);
            this.queue(null);
            return;
        }
        
        molder = Molder.fromSource(source);
        
        if ( !molder.sourcemap ) {
            this.queue(UglifyJS.minify(source, { fromString: true, compress: compress }).code);
            this.queue(null);
            return;
        }
        
        splits = separate(molder, file, root, base, url);
        splits.json = JSON.parse(splits.json);
        source = source.replace(molder.comment, "");
        result = UglifyJS.minify(source, { 
            compress    : compress,
            fromString  : true, 
            inSourceMap : splits.json, 
            outSourceMap: url  || path.basename(file),
            sourceRoot  : root || ""
        });
        
        this.queue(result.code);
        this.queue(null);
        
        /// #fixed: 
        ///   UglifyJS 使用参数 "{fromString: true}" 时，丢失了 "sourcesContent" 中的内容。
        var map = JSON.parse(result.map);
        
        if ( !map.sourcesContent ) {
            map.sourcesContent = splits.json.sourcesContent;
            fs.writeFile(file, JSON.stringify(map));
        }
        
        else {
            fs.writeFile(file, result.map);
        }
    });
}

function minify() {
    var chunks = [];
    var source = "";
    
    return through(function write( data ) {chunks.push(data);}, function done() {
        source = chunks.join("");
        
        this.queue(UglifyJS.minify(source, { fromString: true, compress: compress }).code);
        this.queue(null);
    });
}