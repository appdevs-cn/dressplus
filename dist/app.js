/**
 * 超轻量级模块化组件
 * Created by likaituan on 15/9/18.
 */

(function(window, undefined){
    "use strict";

    var seekjs = window.seekjs = {};
    var modules = seekjs.modules = {};

    //编译
    var req = seekjs.require = function(ids, callback){
        if(typeof ids=="string"){
            ids = [ids];
        }
        var arr = ids.map(function(id) {
            var mod = modules[id];
            if(mod.exports){
                return mod.exports;
            }
            if (typeof(mod.factory) == "function") {
                mod.exports = {};
                var ret = mod.factory(req, mod.exports, mod);
                mod.exports = ret || mod.exports;
            }else {
                mod.exports = mod.factory;
            }
            return mod.exports;
        });

        if(callback){
            return callback.apply(null,arr);
        }
        return arr[0];
    };

    window.define = function (id,factory) {
        var mod = modules[id] = {};
        mod.factory = factory;
    };
    window.define.amd = false;
    window.define.cmd = true;
    /*
    seekjs.define = function (id,factory) {
        var mod = modules[id] = {};
        mod.factory = factory;
    };
    seekjs.define.amd = true;
    seekjs.define.cmd = true;
    */

    //获取最后一个script对象
    var getLastScript = function () {
        var scripts = document.querySelectorAll("script");
        var script = scripts[scripts.length - 1];
        return script;
    };

    var mainPath = getLastScript().dataset.main;
    if(mainPath){
        window.onload = function() {
            req(mainPath);
        }
    }

})(this);


define("root.main", function(req,exp,mod){
	"use strict";

	
	

	var app = req("sys.app");
	var config = req("root.config");

	config.ajaxSetup();
	app.viewEx = req("utils.viewEx");
	app.filterEx = req("utils.filter");
    app.usePlugin("sys.ui.dialog");
	app.setPath({
		js: "js.",
		tp: "tp."
	});


	app.init("login");
});
﻿/**
 * seekApp - 前端轻量级MVC框架
 * Created by likaituan on 14/8/18.
 */

//针对seajs
define("sys.app", function (req, app) {
    "use strict";
    var db = req("sys.data_bind");
    var event = req("sys.event");
    var env = req("sys.env");
    var tp = req("sys.template");
    var transfer = req("sys.transfer");
    var filter = req("sys.filter");
    var $ = req("sys.lib.zepto");

    var context = {};
    var subviewList = [];
    var pluginList = ["sys.ui.mask","sys.ui.dialog","sys.ui.tip"];
    var prevUri = null;

    app.lang = "zh-cn";
    app.useStyle = true;
    app.viewEx = {};
    app.formatEx = {};
    app.plugin = {};
    app.usegrid = true;
    app.useAnimate = false;
    app.aniDuration = 1000;
    app.aniIsPlaying = false;
    app.ext = {
        js: "",
        tp: ".html",
        st: ".css"
    };
    app.midLines = [];
    app.path = {};

    app.langList = {};
    app.langName = "";
    app.lang = {};

    //设置语言(默认中文)
    app.setLang = function (ops) {
        app.langList = filter.langList = ops.list;
        app.switchLang(ops.index);
    };

    //切换语言
    app.switchLang = function (key) {
        app.langName = filter.langName = key;
        app.lang = filter.lang = app.langList[key];
    };

    //设置路径(默认当前路径)
    app.setPath = function (key, path) {
        if(!path){
            path = key;
            key = "main";
        }
        //key = key.replace(/\{\w+\}/g,"-");
        var newPath = {};
		var pathAlias = {
			controller: "js",
			view: "tp",
            style: "st"
		};
		for(var k in path){
			newPath[pathAlias[k]||k] = path[k];
		}
		app.path[key] = newPath;
    };

    //获取路径
    app.getPath = function(ops, _type){
        var file = ops.path;
        if(/^sys\.ui\.\w+$/.test(file)){
            return file + app.ext[_type];
        }
        var a = app.midLines.slice();
        var path = app.path[ops.dir][_type];
        path = path.replace(/\/\-\//g, function(){return "/"+a.shift()+"/"});
        return path + file + app.ext[_type];
    };

    //加载样式
    app.loadStyle = function(cssFile){
        var head = document.querySelector("head");
        if(!dom) {
            var dom = document.createElement("link");
            dom.href = cssFile;
            dom.type = "text/css";
            dom.rel = "stylesheet";
            head.appendChild(dom);
        }
    };


    //程序初始化
    app.init = function (page, container) {
        app.inipage = page;
	    filter.mergeObj(filter, app.filterEx);

        if (container){
            app.container = document.querySelector(container);
        } else {
            app.container = document.createElement("div");
            document.body.appendChild(app.container);
        }
        app.boxWidth = (window.innerWidth > 0 && window.innerWidth<screen.width) ? window.innerWidth : screen.width;//document.body.offsetWidth;
        app.boxHeight = (window.innerHeight > 0) ? window.innerHeight : screen.height;
        app.$container = $(app.container);
        app.useAnimate && transfer.init(app);

        if(location.hash){
            page = location.hash.replace("#","");
        }

        if(!window.onhashchange) {
            window.onhashchange = function (o) {
                if(app.isTry){
                    app.isTry = false;
                }else {
                    app.nextUri = o.newURL.split("#")[1] || app.inipage;
                    !app.aniIsPlaying && app.go2(app.nextUri);
                }
            };
        }

        //增加错误处理
        if(app.errpage) {
            seekjs.onLoadErr = function (file) {
                if (/^ctrl\.\w+$/.test(file)) {
                    app.go(app.homepage);
                }
            };
        }

        app.loadPlugin(function(){

            //弹出提示框
            app.tip = function(){
                app.plugin.tip.showTip.apply(app.plugin.tip, [].slice.call(arguments));
            };

            //弹出框
            app.alert = function(){
                app.plugin.dialog.alert.apply(app.plugin.dialog, [].slice.call(arguments));
            };

            //确认框
            app.confirm = function(){
                app.plugin.dialog.confirm.apply(app.plugin.dialog, [].slice.call(arguments));
            };

            //显示遮罩层
            app.showMask = function(){
                app.plugin.mask.showMask.apply(app.plugin.mask, [].slice.call(arguments));
            };

            //隐藏遮罩层
            app.hideMask = function(){
                app.plugin.mask.hide();
            };

            app.go2(page);
        });
    };

    //主view之间的跳转
    //go 可传多个参数
    app.go = function (page) {
        page = filter.stringFormat.apply(filter, [].slice.call(arguments));
        prevUri = location.hash.replace("#","");
        //location.hash = "#" + page;
        app.isTry = true;
        app.go2(page);
    };

    //页面Hash改变的时候触发的
    var act = "";
    app.go2 = function (page) {
        app.nextUri = null;
        page = decodeURI(page)
        context = {};
        app.loadView({
            parent: null,
            box: app.container,
            type: "main",
            uri: page
        });
    };

    //返回上页
    app.back = function (step) {
        step = step || 1;
        if(step>1){
            history.go(-step);
        }else{
            history.back();
        }
    };

    //加载View
    app.loadView = function (ops) {
        var params = ops.uri.split("/");
        ops.dir = "main";
        app.midLines = [];
        for(var k in app.path){
            if(k!="main") {
                var ks = k.split("/");
                var ps = params.slice();
                //var pn = ops.pathname;
                for (var i = 0; i < ks.length; i++) {
                    var pn = ps.shift();
                    if (ks[i] == "-" || ks[i] == pn) {
                        ks[i] == "-" && app.midLines.push(pn);
                    } else {
                        break;
                    }
                }
                if (i == ks.length) {
                    ops.dir = k;
                    ops.path = ps.shift();
                    params = ps;
                    break;
                }
            }
        }
        if(ops.dir=="main") {
            ops.path = params.shift();
        }
        /*
        if(app.path[ops.pathname]){
            app.key = ops.pathname;
            ops.pathname = params.shift();
        }else if(app.path[ops.pathname+"/-"]){
            app.key = ops.pathname + "/-";
            app.val = params.shift();
            ops.pathname = params.shift();
        }
        */
        var jsFile = app.getPath(ops, "js");
        req(jsFile, function (view) {
            if (view) {
                filter.mergeObj(view, ops);
                filter.mergeObj(view, app.viewEx);
                view.id = ops.id || ops.pathname;
                view.dir = ops.dir;
				view.uri = ops.uri;

                view.tip = app.tip;
                view.alert = app.alert;
                view.confirm = app.confirm;
                view.showMask = app.showMask;
                view.hideMask = app.hideMask;

                view.switchLang = function(key){
                    app.switchLang(key);
                    view.render();
                };

                view.paramType = view.paramType || "double";

                if(view.paramType=="single"){
                    view.params = params;
                }
                else if(view.paramType=="double"){
                    if(params.length==1) {
                        view.params = {id: params[0]};
                    }
                    else{
                        view.params = filter.deserialize(params);
                    }
                }
                app.parseView(view);
            }
        });
    };

    //解析视图
    app.parseView = function (view) {
        if(view.type=="main"){
            app.rootView = view;
        }else if(view.type=="sub"){
            view.parent[view.id] = view;
        }else if (view.type=="plugin"){
            app.plugin[view.id] = view;
        }
		view.root = app.rootView;

        view.render = function () {
            act = "";
            app.parseTemplate(view);
        };
        view.up2model = function (index) {
            db.up2model(view.ui, view, index);
        };
        view.go = function (page) {
            var args = [].slice.call(arguments);
            return app.go.apply(app, args);
        };
        view.back = function (page) {
            var args = [].slice.call(arguments);
            app.back.apply(app, args);
        };
        view.show = function(){
            view.box.dataset.show = true;
            view.box.style.display = "block";
        };
        view.hide = function(){
            view.box.dataset.show = false;
            view.box.style.display = "none";
        };
        view.toggle = function(){
            view.box.toggle();
        };
        app.initView(view);
    };

    //统一初始化view
    app.initView = function(view){
        if (app.onViewInit) {
            if (app.onViewInit.length == 2) {
                app.onViewInit(view, function () {
                    app.initCurrentView(view);
                });
            } else {
                app.onViewInit(view) && app.initCurrentView(view);
            }
        } else {
            app.initCurrentView(view);
        }
    };

    //初始化当前view
    app.initCurrentView = function(view){
        view.from = prevUri;
        if (view.onInit) {
            if(view.onInit.length==0) {
                view.onInit();
                app.chkStyle(view);
            }else if(view.onInit.length==1) {
                view.onInit(function(){
                    app.chkStyle(view);
                });
            }
        } else {
            app.chkStyle(view);
        }
    };

    //检查样式
    app.chkStyle = function(view){
        if(view.cssFile!="none"){
			if(app.path[view.dir].st || /^sys\.ui\./i.test(view.id)){
				var cssFile = view.cssFile || app.getPath(view, "st");
				cssFile = seekjs.resolve(cssFile);
				app.loadStyle(cssFile, view.parent);
			}
        }
        app.chkTemplate(view);
    };

    //修复IOS下微信Title不更新的Bug
    app.repairTitle = function(){
        var $body = $('body');
        var $iframe = $('<iframe src = "/favicon.ico"></iframe>').on('load', function() {
            setTimeout(function() {
                $iframe.off('load').remove();
            }, 0)
        }).appendTo($body);
    };

    //检查模板
    app.chkTemplate = function (view) {
        if(view.type=="main") {
            if(app.isTry) {
                location.hash = "#" + encodeURI(view.uri);
            }
            if(view.title){
                document.title = view.title;
                app.useRepair && app.repairTitle();
            }
            filter.view = view; //注意$.view只能用在主view上

            var ps = JSON.parse(sessionStorage.seekjs_app_pages || '[]');
            var index = ps.indexOf(view.uri);
            act = "forward";
            if (index > -1) {
                if(index==ps.length-2) {
                    act = "back";
                }
                ps = ps.slice(0, index);
            }
            ps.push(view.uri);
            sessionStorage.seekjs_app_pages = JSON.stringify(ps);
        }

        if (view.getTemplate || view.getHTML || view.templateHTML) {
            app.parseTemplate(view);
        } else {
            view.templateFile!="none" && app.loadTemplate(view);
        }
    };

    //加载模板
    app.loadTemplate = function (view) {
        var templateFile = view.templateFile || app.getPath(view, "tp");
        templateFile = seekjs.resolve(templateFile);
        $.ajax({
            type: "get",
            dataType: "text",
            url: templateFile,
            success: function (code) {
                view.templateHTML = code;
                view.getTemplate = null;
                view.getHTML = null;
                app.parseTemplate(view);
            },
            error: function (e) {
                throw templateFile + " is no exist";
            }
        });
    };


    //解析模板
    app.parseTemplate = function (view) {
        if (!view.getTemplate) {
            view.getTemplate = tp.getFun(view.templateHTML);
        }
        if (!view.getHTML) {
            view.getHTML = tp.compileFun(view.getTemplate);
        }

        var html = view.getHTML(view.model || view.root.model || view);
        var div = document.createElement("div");
        div.innerHTML = html;
        if (div.children.length == 1) {
            if (app.useAnimate && view.type == "main" && act && view.box.children.length > 0) {
                view.box.appendChild(div.children[0]);
                app.setUI(view, view.box.children[1]);
                transfer.move(view.box.children[0], view.ui, act, app.aniDuration, function(){
                    if(app.nextUri){
                        app.go2(nextUri);
                    }else {
                        app.parseTemplate2(view);
                    }
                });
            }else {
                view.box.innerHTML = html;
                app.setUI(view, view.box.children[0]);
                app.parseTemplate2(view);
            }
        }else{
            throw "模板有且仅有一个顶级元素";
        }
    };

    //设置UI
    app.setUI = function(view, ui){
        view.ui = ui;
        view.$ui = $(ui);
        view.$ui.css("overflow")=="hidden" && view.$ui.height(app.boxHeight);
        //app.usegrid && grid.use(view.ui); 暂时去掉
    };

    //解析模板2
    app.parseTemplate2 = function (view) {
        //新加功能
        view.box.dataset.show && view.box.dataset.show==="false" && view.hide();

        //解析el元素
        /*
        if (view.el) {
            for (var i in view.el) {
                var queryStr = typeof (view.el[i]) == "string" ? view.el[i] : view.el[i].selector;
                view.el[i] = view.ui.querySelector(queryStr);
            }
        }
        */

        view.pop = {};
        [].forEach.call(view.ui.querySelectorAll("[data-pop]"), function(obj){
            var o = view.pop[obj.dataset.pop] = {};
            o.box = obj;
            app.addCommon(o);
        });

        [].forEach.call(view.ui.querySelectorAll("[data-part]"), function(obj){
            app.setPart(obj, view);
        });

        event.parse(view.ui, view);
        db.parseBind(view.ui, view);

        app.onViewRender && app.onViewRender(view);
        view.onRender && view.onRender();

        //延时
        window.setTimeout(function () {
            //app.usegrid && grid.use(view.ui);
            app.onLoad && app.onLoad(view);
            view.onLoad && view.onLoad();

            [].forEach.call(view.ui.querySelectorAll("[data-view]"), function (obj) {
                subviewList.push([view,obj]);
            });
            app.loadSubView();
        }, 0);
    };

    //加载子页面
    app.loadSubView = function () {
        var a = subviewList.shift();
        if (a) {
            var parentView = a[0];
            var box = a[1];
            app.loadView({
                parent: parentView,
                box: box,
                type: "sub",
                id: box.id || box.dataset.view.split("/")[0], //有些不妥
                uri: box.dataset.view,
                dataset: box.dataset
            });
        }
    };

    //使用插件
    app.usePlugin = function(plugin){
        pluginList.push(plugin);
    };

    //加载插件
    app.loadPlugin = function (callback) {
        var plugin = pluginList.shift();
        if(plugin) {
            var pluginId = plugin.match(/\w+$/)[0];
            if (app.plugin[pluginId]) {
                return callback(app.plugin[pluginId]);
            }
            var jsFile = plugin;// + ".js";
            req(jsFile, function (o) {
                if(o.cssFile != "none") {
                    var cssFile = seekjs.resolve(plugin+".css");
                    if(o.mediaStyle){
                        cssFile = cssFile.replace(/\.css$/, "_"+env.mediaMode+".css");
                    }
                    app.loadStyle(cssFile);
                }
                app.addCommon(o);
                o.box = document.createElement("div");
                o.$box = $(o.box);
                o.box.style.cssText = "position:absolute; left:0; top:0; z-index:99999;";
                document.body.appendChild(o.box);
                o.render = function () {
                    o.box.innerHTML = o.getTemplate.call(o.model||o, $);
                    event.parse(o.box, o);
                    db.parseBind(o.box, o.model||o);
                };
                app.plugin[pluginId] = o;

                app.loadPlugin(callback);
            });
        }else{
            callback();
        }
    };

    //设置分段
    app.setPart = function (obj, view) {
        var partId = obj.dataset.part;
        var o = view[partId] = {};
        app.addCommon(o);
        o.id = partId;
        o.box = obj;
        o.parent = view;
        o.getHTML = function(){
            var html = view.getHTML(view.model||view);
            var div = document.createElement("div");
            div.innerHTML = html;
            html = div.querySelector('[data-part='+ o.id +']').innerHTML;
            div = null;
            return html;
        };
        o.render = function(){
            o.box.innerHTML = o.getHTML();
            event.parse(o.box, view);
            db.parseBind(o.box, view);
            view.onPartRender && view.onPartRender(o);

            /*新增功能:Part也能嵌入子View*/
            [].forEach.call(o.box.querySelectorAll("[data-view]"), function (obj) {
                subviewList.push([view,obj]);
            });
            app.loadSubView();

            return o;
        };
    };

    //继承公用属性和方法
    app.addCommon = function(o){
        o.root = app.rootView;

        //显示
        o.show = function(){
            o.box.style.display = "block";
            return o;
        };

        //隐藏
        o.hide = function(){
            o.box.style.display = "none";
            return o;
        };
    };

});
﻿/**
 * seekDataBind - 前端轻量级数据绑定模块
 * Created by likaituan on 14/8/18.
 */

define("sys.data_bind", function (req, exp) {
	"use strict";

    var oo = {
        val: {
            get: function(ele){
                return ele.value;
            },
            set: function(ele, v){
                ele.value = v;
            }
        },
        txt: {
            get: function(ele){
                if(ele.tagName=="SELECT"){
                    return ele.options[ele.selectedIndex].innerHTML;
                }else {
                    return ele.innerHTML;
                }
            },
            set: function(ele, v){
                if(ele.tagName!="SELECT") {
                    ele.innerHTML = v;
                }
            }
        },
        data: {
            get: function(ele, k){
                if(ele.tagName=="SELECT"){
                    return ele.options[ele.selectedIndex].dataset[k];
                }else {
                    return ele.innerHTML;
                }
            },
            set: function(ele, k, v){
                if(ele.tagName!="SELECT") {
                    ele.dataset[k] = v;
                }
            }
        }
    };

    //查找bind
    exp.findBind = function(box) {
        [].forEach.call(box.children, function (ele) {
            if(!ele.dataset.view) {
                //ele.dataset.bind && exp.elements.push(ele);
	            ele.getAttribute("data-bind") && exp.elements.push(ele); //为了兼容safiri新版本9.0.3
	            exp.findBind(ele);
            }
        });
    };

    //解析绑定 add by Li at 2014-12-9
    exp.parseBind = function (box, view) {
        //[].forEach.call(box.querySelectorAll("[data-bind]"), function (ele) {
        exp.elements = [];
        exp.findBind(box);
        exp.elements.forEach(function (ele) {
            if (ele.dataset.bind == "") {
                return console.warn(ele,"未绑定事件");
            }
            ele.dataset.bind.split(";").forEach(function(item) {
                var pm = item.split(":");
                if (pm.length == 1) {
                    pm = ["val"].concat(pm);
                }
                var p = oo[pm[0]];
                var s = pm[1].split(".");
                var v = view.model || view;
                var k;
                var t = [];
                while (k = s.shift()) {
                    t.push(k);
                    if (s.length > 0 && !v[k]) {
                        throw "the data-bind scope [" + t.join(".") + "] is not defined in the view [" + view.path + "]";
                    }
                    v = v[k];
                }
                p ? p.set(ele, v) : oo.data.set(ele,pm[0],v);
            });
        });
    };

    //更新到模板 add by Li at 2014-12-9
    exp.up2model = function (box, view, index) {
        //[].forEach.call(box.querySelectorAll("[data-bind]"), function (ele) {
        if(index>-1){
            box = box.querySelector("[data--index="+index+"]") || box;
        }
        exp.elements = [];
        exp.findBind(box);
        exp.elements.forEach(function (ele) {
            ele.dataset.bind.split(";").forEach(function(item) {
                var pm = item.split(":");
                if (pm.length == 1) {
                    pm = ["val"].concat(pm);
                }
                var p = oo[pm[0]];
                var s = pm[1].split(".");
                var scope = view.model || view;
                while (s.length > 1) {
                    scope = scope[s.shift()];
                }
                var key = s[0];
                scope[key] = p ? p.get(ele) : oo.data.get(ele,pm[0]);
            });
        });
    };

});
﻿/**
 * seekEvent - 前端轻量级事件解析模块
 * Created by likaituan on 14/8/18.
 */


/*
	@title 通用事件解析模块
	@author Li
	@creatdate 2014-7-6
	@lastdate 2014-12-28
*/

define("sys.event", function (req, exp) {
	"use strict";
	var $ = req("sys.lib.zepto");  //主要用于bind和unbind
	var env = req("sys.env");
	
	//两段分隔符
	var split2 = function (str, flag) {
		var a = str.split(flag);
		var ret = [a.shift().trim()];
		a.length > 0 && ret.push(a.join(flag).trim());
		return ret;
	};

	/**
		@title 解析事件
		@param box 容器 element
		@parem Scope 作用域 object
	*/
	exp.parse = function (box, Scope) {
        var elements = [].slice.call(box.querySelectorAll("[data-event],[data-enter]"));
        box.dataset && (box.dataset.event||box.dataset.enter) && elements.push(box);
		var enter;
		elements.forEach(function (ele) {
            var dataset = ele.dataset;
			enter = enter || dataset.enter && ele;
			var eventStr = dataset.event || dataset.submit || dataset.enter;
			eventStr.split(";").map(function (ema) {
				ema = split2(ema, ">");
				if (ema.length == 1) {
					ema = ["click", ema[0]];
				}
				var ma = split2(ema[1], ":");
				var e = ema[0];
				if(!env.isMobile && e=="tap"){
					e = "click";
				}
				var m = ma[0].split(".");
				var scope = Scope;
				while (m.length > 1) {
					scope = scope[m.shift()];
				}
				m = m[0];
				if (!scope[m]){
					var pos = scope.type && scope.path ? scope.type + "View [" + scope.path + "]" : "targetView";
					throw "method [" + m + "] is no define on the " + pos;
				}
				var args = ma[1] ? ma[1].split(",") : [];
				$(ele).unbind(e).bind(e, function (event) {
					Scope.element = ele;
					Scope.$element = $(ele);
					Scope.event = event;
					Scope.up2model && Scope.up2model();
					scope[m].apply(scope, args);
				});
			});
		});

		//临时加上的,写的比较死,需要重构
		document.onkeyup = enter ? function(e){
			e.keyCode==13 && enter.click();
		} : Scope.type=="main" ? null : document.onkeyup;
	};

});
/* Zepto v1.1.4-95-g601372a - zepto event ajax touch - zeptojs.com/license */
var Zepto=function(){function A(t){return null==t?String(t):j[S.call(t)]||"object"}function L(t){return"function"==A(t)}function $(t){return null!=t&&t==t.window}function Z(t){return null!=t&&t.nodeType==t.DOCUMENT_NODE}function R(t){return"object"==A(t)}function k(t){return R(t)&&!$(t)&&Object.getPrototypeOf(t)==Object.prototype}function F(t){return"number"==typeof t.length}function q(t){return s.call(t,function(t){return null!=t})}function H(t){return t.length>0?n.fn.concat.apply([],t):t}function _(t){return t.replace(/::/g,"/").replace(/([A-Z]+)([A-Z][a-z])/g,"$1_$2").replace(/([a-z\d])([A-Z])/g,"$1_$2").replace(/_/g,"-").toLowerCase()}function z(t){return t in c?c[t]:c[t]=new RegExp("(^|\\s)"+t+"(\\s|$)")}function I(t,e){return"number"!=typeof e||l[_(t)]?e:e+"px"}function U(t){var e,n;return f[t]||(e=u.createElement(t),u.body.appendChild(e),n=getComputedStyle(e,"").getPropertyValue("display"),e.parentNode.removeChild(e),"none"==n&&(n="block"),f[t]=n),f[t]}function X(t){return"children"in t?a.call(t.children):n.map(t.childNodes,function(t){return 1==t.nodeType?t:void 0})}function B(t,e){var n,i=t?t.length:0;for(n=0;i>n;n++)this[n]=t[n];this.length=i,this.selector=e||""}function V(n,i,r){for(e in i)r&&(k(i[e])||D(i[e]))?(k(i[e])&&!k(n[e])&&(n[e]={}),D(i[e])&&!D(n[e])&&(n[e]=[]),V(n[e],i[e],r)):i[e]!==t&&(n[e]=i[e])}function Y(t,e){return null==e?n(t):n(t).filter(e)}function J(t,e,n,i){return L(e)?e.call(t,n,i):e}function G(t,e,n){null==n?t.removeAttribute(e):t.setAttribute(e,n)}function W(e,n){var i=e.className||"",r=i&&i.baseVal!==t;return n===t?r?i.baseVal:i:void(r?i.baseVal=n:e.className=n)}function K(t){try{return t?"true"==t||("false"==t?!1:"null"==t?null:+t+""==t?+t:/^[\[\{]/.test(t)?n.parseJSON(t):t):t}catch(e){return t}}function Q(t,e){e(t);for(var n=0,i=t.childNodes.length;i>n;n++)Q(t.childNodes[n],e)}var t,e,n,i,C,P,r=[],o=r.concat,s=r.filter,a=r.slice,u=window.document,f={},c={},l={"column-count":1,columns:1,"font-weight":1,"line-height":1,opacity:1,"z-index":1,zoom:1},h=/^\s*<(\w+|!)[^>]*>/,p=/^<(\w+)\s*\/?>(?:<\/\1>|)$/,d=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,m=/^(?:body|html)$/i,g=/([A-Z])/g,v=["val","css","html","text","data","width","height","offset"],y=["after","prepend","before","append"],w=u.createElement("table"),x=u.createElement("tr"),b={tr:u.createElement("tbody"),tbody:w,thead:w,tfoot:w,td:x,th:x,"*":u.createElement("div")},E=/complete|loaded|interactive/,T=/^[\w-]*$/,j={},S=j.toString,N={},O=u.createElement("div"),M={tabindex:"tabIndex",readonly:"readOnly","for":"htmlFor","class":"className",maxlength:"maxLength",cellspacing:"cellSpacing",cellpadding:"cellPadding",rowspan:"rowSpan",colspan:"colSpan",usemap:"useMap",frameborder:"frameBorder",contenteditable:"contentEditable"},D=Array.isArray||function(t){return t instanceof Array};return N.matches=function(t,e){if(!e||!t||1!==t.nodeType)return!1;var n=t.webkitMatchesSelector||t.mozMatchesSelector||t.oMatchesSelector||t.matchesSelector;if(n)return n.call(t,e);var i,r=t.parentNode,o=!r;return o&&(r=O).appendChild(t),i=~N.qsa(r,e).indexOf(t),o&&O.removeChild(t),i},C=function(t){return t.replace(/-+(.)?/g,function(t,e){return e?e.toUpperCase():""})},P=function(t){return s.call(t,function(e,n){return t.indexOf(e)==n})},N.fragment=function(e,i,r){var o,s,f;return p.test(e)&&(o=n(u.createElement(RegExp.$1))),o||(e.replace&&(e=e.replace(d,"<$1></$2>")),i===t&&(i=h.test(e)&&RegExp.$1),i in b||(i="*"),f=b[i],f.innerHTML=""+e,o=n.each(a.call(f.childNodes),function(){f.removeChild(this)})),k(r)&&(s=n(o),n.each(r,function(t,e){v.indexOf(t)>-1?s[t](e):s.attr(t,e)})),o},N.Z=function(t,e){return new B(t,e)},N.isZ=function(t){return t instanceof N.Z},N.init=function(e,i){var r;if(!e)return N.Z();if("string"==typeof e)if(e=e.trim(),"<"==e[0]&&h.test(e))r=N.fragment(e,RegExp.$1,i),e=null;else{if(i!==t)return n(i).find(e);r=N.qsa(u,e)}else{if(L(e))return n(u).ready(e);if(N.isZ(e))return e;if(D(e))r=q(e);else if(R(e))r=[e],e=null;else if(h.test(e))r=N.fragment(e.trim(),RegExp.$1,i),e=null;else{if(i!==t)return n(i).find(e);r=N.qsa(u,e)}}return N.Z(r,e)},n=function(t,e){return N.init(t,e)},n.extend=function(t){var e,n=a.call(arguments,1);return"boolean"==typeof t&&(e=t,t=n.shift()),n.forEach(function(n){V(t,n,e)}),t},N.qsa=function(t,e){var n,i="#"==e[0],r=!i&&"."==e[0],o=i||r?e.slice(1):e,s=T.test(o);return t.getElementById&&s&&i?(n=t.getElementById(o))?[n]:[]:1!==t.nodeType&&9!==t.nodeType&&11!==t.nodeType?[]:a.call(s&&!i&&t.getElementsByClassName?r?t.getElementsByClassName(o):t.getElementsByTagName(e):t.querySelectorAll(e))},n.contains=u.documentElement.contains?function(t,e){return t!==e&&t.contains(e)}:function(t,e){for(;e&&(e=e.parentNode);)if(e===t)return!0;return!1},n.type=A,n.isFunction=L,n.isWindow=$,n.isArray=D,n.isPlainObject=k,n.isEmptyObject=function(t){var e;for(e in t)return!1;return!0},n.inArray=function(t,e,n){return r.indexOf.call(e,t,n)},n.camelCase=C,n.trim=function(t){return null==t?"":String.prototype.trim.call(t)},n.uuid=0,n.support={},n.expr={},n.noop=function(){},n.map=function(t,e){var n,r,o,i=[];if(F(t))for(r=0;r<t.length;r++)n=e(t[r],r),null!=n&&i.push(n);else for(o in t)n=e(t[o],o),null!=n&&i.push(n);return H(i)},n.each=function(t,e){var n,i;if(F(t)){for(n=0;n<t.length;n++)if(e.call(t[n],n,t[n])===!1)return t}else for(i in t)if(e.call(t[i],i,t[i])===!1)return t;return t},n.grep=function(t,e){return s.call(t,e)},window.JSON&&(n.parseJSON=JSON.parse),n.each("Boolean Number String Function Array Date RegExp Object Error".split(" "),function(t,e){j["[object "+e+"]"]=e.toLowerCase()}),n.fn={constructor:N.Z,length:0,forEach:r.forEach,reduce:r.reduce,push:r.push,sort:r.sort,splice:r.splice,indexOf:r.indexOf,concat:function(){var t,e,n=[];for(t=0;t<arguments.length;t++)e=arguments[t],n[t]=N.isZ(e)?e.toArray():e;return o.apply(N.isZ(this)?this.toArray():this,n)},map:function(t){return n(n.map(this,function(e,n){return t.call(e,n,e)}))},slice:function(){return n(a.apply(this,arguments))},ready:function(t){return E.test(u.readyState)&&u.body?t(n):u.addEventListener("DOMContentLoaded",function(){t(n)},!1),this},get:function(e){return e===t?a.call(this):this[e>=0?e:e+this.length]},toArray:function(){return this.get()},size:function(){return this.length},remove:function(){return this.each(function(){null!=this.parentNode&&this.parentNode.removeChild(this)})},each:function(t){return r.every.call(this,function(e,n){return t.call(e,n,e)!==!1}),this},filter:function(t){return L(t)?this.not(this.not(t)):n(s.call(this,function(e){return N.matches(e,t)}))},add:function(t,e){return n(P(this.concat(n(t,e))))},is:function(t){return this.length>0&&N.matches(this[0],t)},not:function(e){var i=[];if(L(e)&&e.call!==t)this.each(function(t){e.call(this,t)||i.push(this)});else{var r="string"==typeof e?this.filter(e):F(e)&&L(e.item)?a.call(e):n(e);this.forEach(function(t){r.indexOf(t)<0&&i.push(t)})}return n(i)},has:function(t){return this.filter(function(){return R(t)?n.contains(this,t):n(this).find(t).size()})},eq:function(t){return-1===t?this.slice(t):this.slice(t,+t+1)},first:function(){var t=this[0];return t&&!R(t)?t:n(t)},last:function(){var t=this[this.length-1];return t&&!R(t)?t:n(t)},find:function(t){var e,i=this;return e=t?"object"==typeof t?n(t).filter(function(){var t=this;return r.some.call(i,function(e){return n.contains(e,t)})}):1==this.length?n(N.qsa(this[0],t)):this.map(function(){return N.qsa(this,t)}):n()},closest:function(t,e){var i=this[0],r=!1;for("object"==typeof t&&(r=n(t));i&&!(r?r.indexOf(i)>=0:N.matches(i,t));)i=i!==e&&!Z(i)&&i.parentNode;return n(i)},parents:function(t){for(var e=[],i=this;i.length>0;)i=n.map(i,function(t){return(t=t.parentNode)&&!Z(t)&&e.indexOf(t)<0?(e.push(t),t):void 0});return Y(e,t)},parent:function(t){return Y(P(this.pluck("parentNode")),t)},children:function(t){return Y(this.map(function(){return X(this)}),t)},contents:function(){return this.map(function(){return this.contentDocument||a.call(this.childNodes)})},siblings:function(t){return Y(this.map(function(t,e){return s.call(X(e.parentNode),function(t){return t!==e})}),t)},empty:function(){return this.each(function(){this.innerHTML=""})},pluck:function(t){return n.map(this,function(e){return e[t]})},show:function(){return this.each(function(){"none"==this.style.display&&(this.style.display=""),"none"==getComputedStyle(this,"").getPropertyValue("display")&&(this.style.display=U(this.nodeName))})},replaceWith:function(t){return this.before(t).remove()},wrap:function(t){var e=L(t);if(this[0]&&!e)var i=n(t).get(0),r=i.parentNode||this.length>1;return this.each(function(o){n(this).wrapAll(e?t.call(this,o):r?i.cloneNode(!0):i)})},wrapAll:function(t){if(this[0]){n(this[0]).before(t=n(t));for(var e;(e=t.children()).length;)t=e.first();n(t).append(this)}return this},wrapInner:function(t){var e=L(t);return this.each(function(i){var r=n(this),o=r.contents(),s=e?t.call(this,i):t;o.length?o.wrapAll(s):r.append(s)})},unwrap:function(){return this.parent().each(function(){n(this).replaceWith(n(this).children())}),this},clone:function(){return this.map(function(){return this.cloneNode(!0)})},hide:function(){return this.css("display","none")},toggle:function(e){return this.each(function(){var i=n(this);(e===t?"none"==i.css("display"):e)?i.show():i.hide()})},prev:function(t){return n(this.pluck("previousElementSibling")).filter(t||"*")},next:function(t){return n(this.pluck("nextElementSibling")).filter(t||"*")},html:function(t){return 0 in arguments?this.each(function(e){var i=this.innerHTML;n(this).empty().append(J(this,t,e,i))}):0 in this?this[0].innerHTML:null},text:function(t){return 0 in arguments?this.each(function(e){var n=J(this,t,e,this.textContent);this.textContent=null==n?"":""+n}):0 in this?this.pluck("textContent").join(""):null},attr:function(n,i){var r;return"string"!=typeof n||1 in arguments?this.each(function(t){if(1===this.nodeType)if(R(n))for(e in n)G(this,e,n[e]);else G(this,n,J(this,i,t,this.getAttribute(n)))}):this.length&&1===this[0].nodeType?!(r=this[0].getAttribute(n))&&n in this[0]?this[0][n]:r:t},removeAttr:function(t){return this.each(function(){1===this.nodeType&&t.split(" ").forEach(function(t){G(this,t)},this)})},prop:function(t,e){return t=M[t]||t,1 in arguments?this.each(function(n){this[t]=J(this,e,n,this[t])}):this[0]&&this[0][t]},data:function(e,n){var i="data-"+e.replace(g,"-$1").toLowerCase(),r=1 in arguments?this.attr(i,n):this.attr(i);return null!==r?K(r):t},val:function(t){return 0 in arguments?this.each(function(e){this.value=J(this,t,e,this.value)}):this[0]&&(this[0].multiple?n(this[0]).find("option").filter(function(){return this.selected}).pluck("value"):this[0].value)},offset:function(t){if(t)return this.each(function(e){var i=n(this),r=J(this,t,e,i.offset()),o=i.offsetParent().offset(),s={top:r.top-o.top,left:r.left-o.left};"static"==i.css("position")&&(s.position="relative"),i.css(s)});if(!this.length)return null;if(!n.contains(u.documentElement,this[0]))return{top:0,left:0};var e=this[0].getBoundingClientRect();return{left:e.left+window.pageXOffset,top:e.top+window.pageYOffset,width:Math.round(e.width),height:Math.round(e.height)}},css:function(t,i){if(arguments.length<2){var r,o=this[0];if(!o)return;if(r=getComputedStyle(o,""),"string"==typeof t)return o.style[C(t)]||r.getPropertyValue(t);if(D(t)){var s={};return n.each(t,function(t,e){s[e]=o.style[C(e)]||r.getPropertyValue(e)}),s}}var a="";if("string"==A(t))i||0===i?a=_(t)+":"+I(t,i):this.each(function(){this.style.removeProperty(_(t))});else for(e in t)t[e]||0===t[e]?a+=_(e)+":"+I(e,t[e])+";":this.each(function(){this.style.removeProperty(_(e))});return this.each(function(){this.style.cssText+=";"+a})},index:function(t){return t?this.indexOf(n(t)[0]):this.parent().children().indexOf(this[0])},hasClass:function(t){return t?r.some.call(this,function(t){return this.test(W(t))},z(t)):!1},addClass:function(t){return t?this.each(function(e){if("className"in this){i=[];var r=W(this),o=J(this,t,e,r);o.split(/\s+/g).forEach(function(t){n(this).hasClass(t)||i.push(t)},this),i.length&&W(this,r+(r?" ":"")+i.join(" "))}}):this},removeClass:function(e){return this.each(function(n){if("className"in this){if(e===t)return W(this,"");i=W(this),J(this,e,n,i).split(/\s+/g).forEach(function(t){i=i.replace(z(t)," ")}),W(this,i.trim())}})},toggleClass:function(e,i){return e?this.each(function(r){var o=n(this),s=J(this,e,r,W(this));s.split(/\s+/g).forEach(function(e){(i===t?!o.hasClass(e):i)?o.addClass(e):o.removeClass(e)})}):this},scrollTop:function(e){if(this.length){var n="scrollTop"in this[0];return e===t?n?this[0].scrollTop:this[0].pageYOffset:this.each(n?function(){this.scrollTop=e}:function(){this.scrollTo(this.scrollX,e)})}},scrollLeft:function(e){if(this.length){var n="scrollLeft"in this[0];return e===t?n?this[0].scrollLeft:this[0].pageXOffset:this.each(n?function(){this.scrollLeft=e}:function(){this.scrollTo(e,this.scrollY)})}},position:function(){if(this.length){var t=this[0],e=this.offsetParent(),i=this.offset(),r=m.test(e[0].nodeName)?{top:0,left:0}:e.offset();return i.top-=parseFloat(n(t).css("margin-top"))||0,i.left-=parseFloat(n(t).css("margin-left"))||0,r.top+=parseFloat(n(e[0]).css("border-top-width"))||0,r.left+=parseFloat(n(e[0]).css("border-left-width"))||0,{top:i.top-r.top,left:i.left-r.left}}},offsetParent:function(){return this.map(function(){for(var t=this.offsetParent||u.body;t&&!m.test(t.nodeName)&&"static"==n(t).css("position");)t=t.offsetParent;return t})}},n.fn.detach=n.fn.remove,["width","height"].forEach(function(e){var i=e.replace(/./,function(t){return t[0].toUpperCase()});n.fn[e]=function(r){var o,s=this[0];return r===t?$(s)?s["inner"+i]:Z(s)?s.documentElement["scroll"+i]:(o=this.offset())&&o[e]:this.each(function(t){s=n(this),s.css(e,J(this,r,t,s[e]()))})}}),y.forEach(function(t,e){var i=e%2;n.fn[t]=function(){var t,o,r=n.map(arguments,function(e){return t=A(e),"object"==t||"array"==t||null==e?e:N.fragment(e)}),s=this.length>1;return r.length<1?this:this.each(function(t,a){o=i?a:a.parentNode,a=0==e?a.nextSibling:1==e?a.firstChild:2==e?a:null;var f=n.contains(u.documentElement,o);r.forEach(function(t){if(s)t=t.cloneNode(!0);else if(!o)return n(t).remove();o.insertBefore(t,a),f&&Q(t,function(t){null==t.nodeName||"SCRIPT"!==t.nodeName.toUpperCase()||t.type&&"text/javascript"!==t.type||t.src||window.eval.call(window,t.innerHTML)})})})},n.fn[i?t+"To":"insert"+(e?"Before":"After")]=function(e){return n(e)[t](this),this}}),N.Z.prototype=B.prototype=n.fn,N.uniq=P,N.deserializeValue=K,n.zepto=N,n}();window.Zepto=Zepto,void 0===window.$&&(window.$=Zepto),function(t){function l(t){return t._zid||(t._zid=e++)}function h(t,e,n,i){if(e=p(e),e.ns)var r=d(e.ns);return(s[l(t)]||[]).filter(function(t){return t&&(!e.e||t.e==e.e)&&(!e.ns||r.test(t.ns))&&(!n||l(t.fn)===l(n))&&(!i||t.sel==i)})}function p(t){var e=(""+t).split(".");return{e:e[0],ns:e.slice(1).sort().join(" ")}}function d(t){return new RegExp("(?:^| )"+t.replace(" "," .* ?")+"(?: |$)")}function m(t,e){return t.del&&!u&&t.e in f||!!e}function g(t){return c[t]||u&&f[t]||t}function v(e,i,r,o,a,u,f){var h=l(e),d=s[h]||(s[h]=[]);i.split(/\s/).forEach(function(i){if("ready"==i)return t(document).ready(r);var s=p(i);s.fn=r,s.sel=a,s.e in c&&(r=function(e){var n=e.relatedTarget;return!n||n!==this&&!t.contains(this,n)?s.fn.apply(this,arguments):void 0}),s.del=u;var l=u||r;s.proxy=function(t){if(t=T(t),!t.isImmediatePropagationStopped()){t.data=o;var i=l.apply(e,t._args==n?[t]:[t].concat(t._args));return i===!1&&(t.preventDefault(),t.stopPropagation()),i}},s.i=d.length,d.push(s),"addEventListener"in e&&e.addEventListener(g(s.e),s.proxy,m(s,f))})}function y(t,e,n,i,r){var o=l(t);(e||"").split(/\s/).forEach(function(e){h(t,e,n,i).forEach(function(e){delete s[o][e.i],"removeEventListener"in t&&t.removeEventListener(g(e.e),e.proxy,m(e,r))})})}function T(e,i){return(i||!e.isDefaultPrevented)&&(i||(i=e),t.each(E,function(t,n){var r=i[t];e[t]=function(){return this[n]=w,r&&r.apply(i,arguments)},e[n]=x}),(i.defaultPrevented!==n?i.defaultPrevented:"returnValue"in i?i.returnValue===!1:i.getPreventDefault&&i.getPreventDefault())&&(e.isDefaultPrevented=w)),e}function j(t){var e,i={originalEvent:t};for(e in t)b.test(e)||t[e]===n||(i[e]=t[e]);return T(i,t)}var n,e=1,i=Array.prototype.slice,r=t.isFunction,o=function(t){return"string"==typeof t},s={},a={},u="onfocusin"in window,f={focus:"focusin",blur:"focusout"},c={mouseenter:"mouseover",mouseleave:"mouseout"};a.click=a.mousedown=a.mouseup=a.mousemove="MouseEvents",t.event={add:v,remove:y},t.proxy=function(e,n){var s=2 in arguments&&i.call(arguments,2);if(r(e)){var a=function(){return e.apply(n,s?s.concat(i.call(arguments)):arguments)};return a._zid=l(e),a}if(o(n))return s?(s.unshift(e[n],e),t.proxy.apply(null,s)):t.proxy(e[n],e);throw new TypeError("expected function")},t.fn.bind=function(t,e,n){return this.on(t,e,n)},t.fn.unbind=function(t,e){return this.off(t,e)},t.fn.one=function(t,e,n,i){return this.on(t,e,n,i,1)};var w=function(){return!0},x=function(){return!1},b=/^([A-Z]|returnValue$|layer[XY]$)/,E={preventDefault:"isDefaultPrevented",stopImmediatePropagation:"isImmediatePropagationStopped",stopPropagation:"isPropagationStopped"};t.fn.delegate=function(t,e,n){return this.on(e,t,n)},t.fn.undelegate=function(t,e,n){return this.off(e,t,n)},t.fn.live=function(e,n){return t(document.body).delegate(this.selector,e,n),this},t.fn.die=function(e,n){return t(document.body).undelegate(this.selector,e,n),this},t.fn.on=function(e,s,a,u,f){var c,l,h=this;return e&&!o(e)?(t.each(e,function(t,e){h.on(t,s,a,e,f)}),h):(o(s)||r(u)||u===!1||(u=a,a=s,s=n),(u===n||a===!1)&&(u=a,a=n),u===!1&&(u=x),h.each(function(n,r){f&&(c=function(t){return y(r,t.type,u),u.apply(this,arguments)}),s&&(l=function(e){var n,o=t(e.target).closest(s,r).get(0);return o&&o!==r?(n=t.extend(j(e),{currentTarget:o,liveFired:r}),(c||u).apply(o,[n].concat(i.call(arguments,1)))):void 0}),v(r,e,u,a,s,l||c)}))},t.fn.off=function(e,i,s){var a=this;return e&&!o(e)?(t.each(e,function(t,e){a.off(t,i,e)}),a):(o(i)||r(s)||s===!1||(s=i,i=n),s===!1&&(s=x),a.each(function(){y(this,e,s,i)}))},t.fn.trigger=function(e,n){return e=o(e)||t.isPlainObject(e)?t.Event(e):T(e),e._args=n,this.each(function(){e.type in f&&"function"==typeof this[e.type]?this[e.type]():"dispatchEvent"in this?this.dispatchEvent(e):t(this).triggerHandler(e,n)})},t.fn.triggerHandler=function(e,n){var i,r;return this.each(function(s,a){i=j(o(e)?t.Event(e):e),i._args=n,i.target=a,t.each(h(a,e.type||e),function(t,e){return r=e.proxy(i),i.isImmediatePropagationStopped()?!1:void 0})}),r},"focusin focusout focus blur load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select keydown keypress keyup error".split(" ").forEach(function(e){t.fn[e]=function(t){return 0 in arguments?this.bind(e,t):this.trigger(e)}}),t.Event=function(t,e){o(t)||(e=t,t=e.type);var n=document.createEvent(a[t]||"Events"),i=!0;if(e)for(var r in e)"bubbles"==r?i=!!e[r]:n[r]=e[r];return n.initEvent(t,i,!0),T(n)}}(Zepto),function(t){function h(e,n,i){var r=t.Event(n);return t(e).trigger(r,i),!r.isDefaultPrevented()}function p(t,e,i,r){return t.global?h(e||n,i,r):void 0}function d(e){e.global&&0===t.active++&&p(e,null,"ajaxStart")}function m(e){e.global&&!--t.active&&p(e,null,"ajaxStop")}function g(t,e){var n=e.context;return e.beforeSend.call(n,t,e)===!1||p(e,n,"ajaxBeforeSend",[t,e])===!1?!1:void p(e,n,"ajaxSend",[t,e])}function v(t,e,n,i){var r=n.context,o="success";n.success.call(r,t,o,e),i&&i.resolveWith(r,[t,o,e]),p(n,r,"ajaxSuccess",[e,n,t]),w(o,e,n)}function y(t,e,n,i,r){var o=i.context;i.error.call(o,n,e,t),r&&r.rejectWith(o,[n,e,t]),p(i,o,"ajaxError",[n,i,t||e]),w(e,n,i)}function w(t,e,n){var i=n.context;n.complete.call(i,e,t),p(n,i,"ajaxComplete",[e,n]),m(n)}function x(){}function b(t){return t&&(t=t.split(";",2)[0]),t&&(t==f?"html":t==u?"json":s.test(t)?"script":a.test(t)&&"xml")||"text"}function E(t,e){return""==e?t:(t+"&"+e).replace(/[&?]{1,2}/,"?")}function T(e){e.processData&&e.data&&"string"!=t.type(e.data)&&(e.data=t.param(e.data,e.traditional)),!e.data||e.type&&"GET"!=e.type.toUpperCase()||(e.url=E(e.url,e.data),e.data=void 0)}function j(e,n,i,r){return t.isFunction(n)&&(r=i,i=n,n=void 0),t.isFunction(i)||(r=i,i=void 0),{url:e,data:n,success:i,dataType:r}}function N(e,n,i,r){var o,s=t.isArray(n),a=t.isPlainObject(n);t.each(n,function(n,u){o=t.type(u),r&&(n=i?r:r+"["+(a||"object"==o||"array"==o?n:"")+"]"),!r&&s?e.add(u.name,u.value):"array"==o||!i&&"object"==o?N(e,u,i,n):e.add(n,u)})}var i,r,e=0,n=window.document,o=/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,s=/^(?:text|application)\/javascript/i,a=/^(?:text|application)\/xml/i,u="application/json",f="text/html",c=/^\s*$/,l=n.createElement("a");l.href=window.location.href,t.active=0,t.ajaxJSONP=function(i,r){if(!("type"in i))return t.ajax(i);var f,h,o=i.jsonpCallback,s=(t.isFunction(o)?o():o)||"jsonp"+ ++e,a=n.createElement("script"),u=window[s],c=function(e){t(a).triggerHandler("error",e||"abort")},l={abort:c};return r&&r.promise(l),t(a).on("load error",function(e,n){clearTimeout(h),t(a).off().remove(),"error"!=e.type&&f?v(f[0],l,i,r):y(null,n||"error",l,i,r),window[s]=u,f&&t.isFunction(u)&&u(f[0]),u=f=void 0}),g(l,i)===!1?(c("abort"),l):(window[s]=function(){f=arguments},a.src=i.url.replace(/\?(.+)=\?/,"?$1="+s),n.head.appendChild(a),i.timeout>0&&(h=setTimeout(function(){c("timeout")},i.timeout)),l)},t.ajaxSettings={type:"GET",beforeSend:x,success:x,error:x,complete:x,context:null,global:!0,xhr:function(){return new window.XMLHttpRequest},accepts:{script:"text/javascript, application/javascript, application/x-javascript",json:u,xml:"application/xml, text/xml",html:f,text:"text/plain"},crossDomain:!1,timeout:0,processData:!0,cache:!0},t.ajax=function(e){var a,u,o=t.extend({},e||{}),s=t.Deferred&&t.Deferred();for(i in t.ajaxSettings)void 0===o[i]&&(o[i]=t.ajaxSettings[i]);d(o),o.crossDomain||(a=n.createElement("a"),a.href=o.url,a.href=a.href,o.crossDomain=l.protocol+"//"+l.host!=a.protocol+"//"+a.host),o.url||(o.url=window.location.toString()),(u=o.url.indexOf("#"))>-1&&(o.url=o.url.slice(0,u)),T(o);var f=o.dataType,h=/\?.+=\?/.test(o.url);if(h&&(f="jsonp"),o.cache!==!1&&(e&&e.cache===!0||"script"!=f&&"jsonp"!=f)||(o.url=E(o.url,"_="+Date.now())),"jsonp"==f)return h||(o.url=E(o.url,o.jsonp?o.jsonp+"=?":o.jsonp===!1?"":"callback=?")),t.ajaxJSONP(o,s);var C,p=o.accepts[f],m={},w=function(t,e){m[t.toLowerCase()]=[t,e]},j=/^([\w-]+:)\/\//.test(o.url)?RegExp.$1:window.location.protocol,S=o.xhr(),N=S.setRequestHeader;if(s&&s.promise(S),o.crossDomain||w("X-Requested-With","XMLHttpRequest"),w("Accept",p||"*/*"),(p=o.mimeType||p)&&(p.indexOf(",")>-1&&(p=p.split(",",2)[0]),S.overrideMimeType&&S.overrideMimeType(p)),(o.contentType||o.contentType!==!1&&o.data&&"GET"!=o.type.toUpperCase())&&w("Content-Type",o.contentType||"application/x-www-form-urlencoded"),o.headers)for(r in o.headers)w(r,o.headers[r]);if(S.setRequestHeader=w,S.onreadystatechange=function(){if(4==S.readyState){S.onreadystatechange=x,clearTimeout(C);var e,n=!1;if(S.status>=200&&S.status<300||304==S.status||0==S.status&&"file:"==j){if(f=f||b(o.mimeType||S.getResponseHeader("content-type")),"arraybuffer"==S.responseType||"blob"==S.responseType)e=S.response;else{e=S.responseText;try{"script"==f?(1,eval)(e):"xml"==f?e=S.responseXML:"json"==f&&(e=c.test(e)?null:t.parseJSON(e))}catch(i){n=i}if(n)return y(n,"parsererror",S,o,s)}v(e,S,o,s)}else y(S.statusText||null,S.status?"error":"abort",S,o,s)}},g(S,o)===!1)return S.abort(),y(null,"abort",S,o,s),S;if(o.xhrFields)for(r in o.xhrFields)S[r]=o.xhrFields[r];var P="async"in o?o.async:!0;S.open(o.type,o.url,P,o.username,o.password);for(r in m)N.apply(S,m[r]);return o.timeout>0&&(C=setTimeout(function(){S.onreadystatechange=x,S.abort(),y(null,"timeout",S,o,s)},o.timeout)),S.send(o.data?o.data:null),S},t.get=function(){return t.ajax(j.apply(null,arguments))},t.post=function(){var e=j.apply(null,arguments);return e.type="POST",t.ajax(e)},t.getJSON=function(){var e=j.apply(null,arguments);return e.dataType="json",t.ajax(e)},t.fn.load=function(e,n,i){if(!this.length)return this;var a,r=this,s=e.split(/\s/),u=j(e,n,i),f=u.success;return s.length>1&&(u.url=s[0],a=s[1]),u.success=function(e){r.html(a?t("<div>").html(e.replace(o,"")).find(a):e),f&&f.apply(r,arguments)},t.ajax(u),this};var S=encodeURIComponent;t.param=function(e,n){var i=[];return i.add=function(e,n){t.isFunction(n)&&(n=n()),null==n&&(n=""),this.push(S(e)+"="+S(n))},N(i,e,n),i.join("&").replace(/%20/g,"+")}}(Zepto),function(t){function u(t,e,n,i){return Math.abs(t-e)>=Math.abs(n-i)?t-e>0?"Left":"Right":n-i>0?"Up":"Down"}function f(){o=null,e.last&&(e.el.trigger("longTap"),e={})}function c(){o&&clearTimeout(o),o=null}function l(){n&&clearTimeout(n),i&&clearTimeout(i),r&&clearTimeout(r),o&&clearTimeout(o),n=i=r=o=null,e={}}function h(t){return("touch"==t.pointerType||t.pointerType==t.MSPOINTER_TYPE_TOUCH)&&t.isPrimary}function p(t,e){return t.type=="pointer"+e||t.type.toLowerCase()=="mspointer"+e}var n,i,r,o,a,e={},s=750;t(document).ready(function(){var d,m,y,w,g=0,v=0;"MSGesture"in window&&(a=new MSGesture,a.target=document.body),t(document).bind("MSGestureEnd",function(t){var n=t.velocityX>1?"Right":t.velocityX<-1?"Left":t.velocityY>1?"Down":t.velocityY<-1?"Up":null;n&&(e.el.trigger("swipe"),e.el.trigger("swipe"+n))}).on("touchstart MSPointerDown pointerdown",function(i){(!(w=p(i,"down"))||h(i))&&(y=w?i:i.touches[0],i.touches&&1===i.touches.length&&e.x2&&(e.x2=void 0,e.y2=void 0),d=Date.now(),m=d-(e.last||d),e.el=t("tagName"in y.target?y.target:y.target.parentNode),n&&clearTimeout(n),e.x1=y.pageX,e.y1=y.pageY,m>0&&250>=m&&(e.isDoubleTap=!0),e.last=d,o=setTimeout(f,s),a&&w&&a.addPointer(i.pointerId))}).on("touchmove MSPointerMove pointermove",function(t){(!(w=p(t,"move"))||h(t))&&(y=w?t:t.touches[0],c(),e.x2=y.pageX,e.y2=y.pageY,g+=Math.abs(e.x1-e.x2),v+=Math.abs(e.y1-e.y2))}).on("touchend MSPointerUp pointerup",function(o){(!(w=p(o,"up"))||h(o))&&(c(),e.x2&&Math.abs(e.x1-e.x2)>30||e.y2&&Math.abs(e.y1-e.y2)>30?r=setTimeout(function(){e.el.trigger("swipe"),e.el.trigger("swipe"+u(e.x1,e.x2,e.y1,e.y2)),e={}},0):"last"in e&&(30>g&&30>v?i=setTimeout(function(){var i=t.Event("tap");i.cancelTouch=l,e.el.trigger(i),e.isDoubleTap?(e.el&&e.el.trigger("doubleTap"),e={}):n=setTimeout(function(){n=null,e.el&&e.el.trigger("singleTap"),e={}},250)},0):e={}),g=v=0)}).on("touchcancel MSPointerCancel pointercancel",l),t(window).on("scroll",l)}),["swipe","swipeLeft","swipeRight","swipeUp","swipeDown","doubleTap","tap","singleTap","longTap"].forEach(function(e){t.fn[e]=function(t){return this.on(e,t)}})}(Zepto);



define("sys.lib.zepto", function(require, exports, module){
    module.exports = Zepto;
});﻿define("sys.env", function (req, exp) {
	"use strict";

	var ua = exp.ua = navigator.userAgent;

	exp.os = "window";
    exp.browser = {
        name: "ie"
    };

	if (/ios/i.test(ua)) {
		exp.os = "ios";
		exp.ios = {
			version:0
		}
	}
	if (/android/i.test(ua)) {
		exp.os = "android";
		exp.android = {
			version:0
		}
	}
	if (/Mac OS X/i.test(ua)) {
		exp.os = "mac";
		exp.browser = {
            name: /chrome/i.test(ua) ? "chrome" : "safari",
			version: 0
		}
	}

    exp.mediaMode = screen.width>screen.height ? "pad" : "phone";
    exp.isMobile = /android|ios/.test(exp.os);

});﻿/**
 * seekTemplate - 前端轻量级模板插件
 * Created by likaituan on 14/8/18.
 */

define("sys.template", function (req, exp) {
	"use strict";
    var $ = req("sys.filter");
	$.local = localStorage;
	$.session = sessionStorage;

	//生成JS代码
	exp.getJsCode= function (tmpCode) {
		tmpCode = tmpCode.replace(/\r\n|\r|\n/g, ""); //去除换行符
		var jscode = [];
		jscode.push('var buf = [];');
		var R = RegExp;
        var literalRe = /\{literal\}([\s\S]+?)\{\/literal\}/;
        var jsRe = /<%([\s\S]+?)%>/;
        var smartyRe = /\{(.+?)\}/;

		//添加HTML代码
		var addHTML = function (s) {
			s = s.replace(/【/g, "{").replace(/】/g, "}");
			s = s.replace(/'/g, "\\'");
			jscode.push("buf.push('" + s + "');");
		};

		//添加JS代码
		var addJs = function (ss) {
			ss = ss.replace(/\$\((.+?)\);?/g, "buf.push($1);");
			jscode.push(ss);
		};

		//解析Smarty代码
		var o;
		var parseSmarty = function (ss) {
			//ss = ss.replace(/\$/g, "this.");
			var aa = ss.split(" ");
			var s0 = aa.shift();
			if (s0 == "foreach") {
				o = {};
				aa.map(function (exp) {
					exp = exp.split("=");
					o[exp[0]] = exp[1];
				});
				var key = o.key || "i";
				var item = o.item || "item";
				if (o.start) {
					jscode.push("for(var " + key + "=" + o.start + ";" + key + "<=" + o.end + "; " + key + "++){");
				} else {
                    var a = o.from||o.src;
					jscode.push("var sn,src;for(var " + key + " in " + a + "){");
                    jscode.push("var " + item + "=" + a + "[" + key + "];");
                    jscode.push("sn="+key+"*1+1;");
                    jscode.push("src={length:"+a+".length, first:"+key+"==0, last:"+key+"=="+a+".length-1};");
				}
			} else if (s0 == "elseforeach" || s0=="elseach") {
				jscode.push("}; if(" + (o.from||o.src) + ".length==0){");
			} else if (s0 == "/foreach") {
				jscode.push("}");

			} else if (s0 == "if") {
				jscode.push("if(" + aa[0] + "){");
			} else if (s0 == "elseif" || s0=="elsif") {
				jscode.push("}else if(" + aa[0] + "){");
			} else if (s0 == "else") {
				jscode.push("}else{");
			} else if (s0 == "/if") {
				jscode.push("}");


			} else if (s0 == "loop") {
				jscode.push(filter.stringFormat("for(var {0}={1}; {0}<={2}; {0}++){", aa[0], aa[2], aa[4]));
			} else if (s0 == "/loop") {
				jscode.push("}");


			} else if (ss[0] == "=") {
				jscode.push("console.log("+ss.slice(1)+");");
			} else {
				var smf = $.split2(ss, "|");
				//避免碰到||的时候
				if (smf[1] && smf[1][0] == "|") {
					smf = [ss];
				}
				var s = smf[0];
				if (smf[1]) {
					var mf = $.split2(smf[1], ":");
					var m = mf[0];
					var f = mf[1];
					s = f ? "$." + m + "(" + s + ",'" + f + "')" : "$." + m + "(" + s + ")";
				}
				s && jscode.push("buf.push(" + s + ");");
			}
		};

		//先编译literal字面量
		var compileLiteral = function (code) {
			if (literalRe.test(code)) {
				var a = [R.leftContext, R.$1.trim(), R.rightContext];
				a[0] && compileJs(a[0]);
				a[1] && addHTML(a[1]);
				a[2] && compileLiteral(a[2]);
			} else {
				compileJs(code);
			}
		};

        //然后编译JS
		var compileJs = function (code) {
			if (jsRe.test(code)) {
				var a = [R.leftContext, R.$1, R.rightContext];
				a[0] && compileSmarty(a[0]);
				a[1] && addJs(a[1]);
				a[2] && compileJs(a[2]);
			} else {
				compileSmarty(code);
			}
		};


		//最后编译Smarty语法
		var compileSmarty = function (code) {
			code = code.replace(/\{\{/g, "【").replace(/\}\}/g, "】");
			if (smartyRe.test(code)) {
				var a = [R.leftContext, R.$1, R.rightContext];
				a[0] && addHTML(a[0]);
				a[1] && parseSmarty(a[1]);
				a[2] && compileSmarty(a[2]);
			} else {
				addHTML(code);
			}
		};

		compileLiteral(tmpCode);

		jscode.push('return buf.join("");');
		jscode = jscode.join("\n");
        //console.log(jscode);
        return jscode;
    };

    //获得编译函数
    exp.getFun = function (tplCode) {
        var jscode = exp.getJsCode(tplCode);
		return new Function("$", jscode);
	};

    //编译函数
    exp.compileFun = function (tplFun) {
        return function (data) {
            return tplFun.call(data, $);
        };
    };

    //直接编译模板代码
    exp.compile = function (tplCode) {
        var jscode = exp.getJsCode(tplCode);
        //console.log(jscode);
        var templateFun = new Function("$", jscode);
        return exp.compileFun(templateFun);
    };

});
﻿/**
    @title 模板格式化
*/
define("sys.filter", function (req, exp) {
	"use strict";

    /*=====================处理字符串======================*/

    //字符串格式化
    exp.stringFormat = exp.SF = function (str, _obj) {
        if(arguments.length==1){
            return str;
        }else if(arguments.length==2 && exp.isPlainObject(_obj)){
            return str.replace(/\{(\w+)\}/g, function (_, key) {
                return _obj[key];
            });
        }else{
            var arr = [].slice.call(arguments, 1);
            return str.replace(/\{(\d+)\}/g, function (_, n) {
                return arr[n];
            });
        }
    };

    //字符格式化
    exp.strFormat = function () {
        var args = [].slice.call(arguments);
        var str = args.shift();
        args.forEach(function (arg,i) {
            str = str.replace("{"+i+"}", arg);
        });
        return str;
    };

    //取头几位
    exp.begin = function(str, n){
        return str.slice(0,n);
    };

    //取末几位
    exp.end = function(str, n){
        return str.slice(-n);
    };

    //转大写字母
    exp.upper = function(str){
        return str.toUpperCase();
    };

    //转小写字母
    exp.lower = function(str){
        return str.toLowerCase();
    };

    //根据指定的分隔符截成两半
    exp.split2 = function (str, flag) {
        var a = str.split(flag);
        var ret = [a.shift()];
        a.length > 0 && ret.push(a.join(flag));
        return ret;
    };


    /*=====================处理数字======================*/


    //分隔符
    exp.separator = exp.sep = function(num, n){
        n = n || 3;
        num = (+num).toString().split(".");
        var re = new RegExp("\\d(?=(\\d{"+n+"})+$)", "g");
        return num[0].replace(re, "$&,") + (num[1] ? "." + num[1] : "");
    };


    //数字转中文(0-99之间)
    exp.num2cn = function (num) {
        var baseCnNums = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
        var a = num.toString().split("");
        if (num < 11) {
            return baseCnNums[num];
        } else if (num < 20) {
            return "十" + baseCnNums[a[1]];
        } else if (num % 10 == 0) {
            return baseCnNums[a[0]] + "十";
        } else {
            return a.map(function (n) { return baseCnNums[n] }).join("十");
        }
    };

    /**
     @title 千分位格式化
     @param num 数字 number
     @param bit 保留小数点位数 number 2
     @return [string]
     */
    exp.number_format = function (num, bit) {
        //非正常值
        if (num==="" || num===null || num===NaN || num===undefined) {
            return "";
        }
        //非数字
        if (!/^\-?\d+(\.\d+)?$/.test(num)) {
            return num;
        }
        //不传bit参数
        if (bit === undefined) {
            bit = 2;
        }
        num = (+num).toFixed(bit).split(".");
        var re = new RegExp("\\d(?=(\\d{3})+$)", "g");
        return num[0].replace(re, "$&,") + (num[1] ? "." + num[1] : "");
    };

    //万分位格式化
    exp.formatNum = function (num, bit) {
        //非正常值
        if (num === "" || num === null || num === NaN || num === undefined) {
            return "";
        }
        //非数字
        if (!/^\-?\d+(\.\d+)?$/.test(num)) {
            return num;
        }
        //不传bit参数
        if (bit === undefined) {
            bit = 0;
        }
        num = (+num).toFixed(bit).split(".");
        var re = new RegExp("\\d(?=(\\d{4})+$)", "g");
        return num[0].replace(re, "$&,") + (num[1] ? "." + num[1] : "");
    };

    //分隔符
    exp.separator = exp.sep = function(num, n){
        n = n || 3;
        num = (+num).toString().split(".");
        var re = new RegExp("\\d(?=(\\d{"+n+"})+$)", "g");
        return num[0].replace(re, "$&,") + (num[1] ? "." + num[1] : "");
    };

    //货币格式化
    exp.currency = function(num, n){
        if(n!==undefined && n>0){
            return exp.separator(num.toFixed(2),n);
        }
        return (+num).toFixed(2);
    };

    //人民币格式化
    exp.rmb = function(num){
        if(typeof(num)!="number" && !num){
            //throw "rmb格式化数字为空";
            return "";
        }else if(/^\-?\d+(\.\d+)?$/.test(num)==false){
            throw "rmb格式化数字无效";
        }
        return parseInt(num).toString().replace(/\d(?=(\d{3})+$)/g, "$&,") + "." + (+num).toFixed(2).split(".")[1];
    };

    exp.bit = function(num, n){
        return (+num).toFixed(n);
    };

    //求百分比
    exp.percent = function (num1, num2, bit) {
        num1 = +num1;
        num2 = +num2;
        return ( num2===0 ? 0 : num1 / (num2||1) *100 ).toFixed(bit || 0) + "%";
    };

    /*=====================处理日期======================*/

    //解析日期
    exp.parseDate = function (date) {
        if (arguments.length == 3) {
            date = new Date(date, arguments[1], arguments[2]);
        } else if (typeof (date) == "string") {
            date = new Date(date.replace(/\-/g, "/"));
        } else if (typeof (date) == "number") {
            date = new Date(date);
        }
        return date;
    };

    //日期解析
    exp.parseDate_bak = function (date) {
        if (typeof date == "string") {
            date = date.split('.')[0].replace(/\-/g,"/").replace('T', ' ');
        }
        if (typeof date != "object") {
            date = new Date(date);
        }
        return date;
    };

    //时间格式化（YYYY-MM-DD hh:mm:ss形式）
    exp.timeFormat = function(date) {
        return date.toISOString().replace("T"," ").replace(/\..+$/,"");
    };

    //比较两个日期的大小
    exp.diffDate = function(d1, d2){
        d1 = new Date(d1);
        d2 = d2 ? new Date(d2) : new Date();
        var t1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
        var t2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
        return t1>t2 ? "gt" : t1<t2 ? "lt" : "eq";
    };

    //日期格式化
    exp.dateFormat = function (date, fmtString, flag) {
        date = exp.parseDate(date);
        if (!date) {
            return "";
        }
        if (flag) {
            var s = new Date().getTime() / 1000 - date.getTime() / 1000;
            if (s > 0 && s < 3600) {
                return Math.ceil(s / 60) + "分钟前";
            } else if (s > 0 && s < 86400) {
                return Math.round(s / 3600) + "小时前";
            }
        }
        var e = {
            "M+": date.getMonth() + 1,
            "d+": date.getDate(),
            "h+": date.getHours(),
            "m+": date.getMinutes(),
            "s+": date.getSeconds(),
            "q+": Math.floor((date.getMonth() + 3) / 3),
            "S": date.getMilliseconds()
        };
        if (/(y+)/.test(fmtString)) {
            fmtString = fmtString.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
        }
        for (var d in e) {
            if (new RegExp("(" + d + ")").test(fmtString)) {
                fmtString = fmtString.replace(RegExp.$1, RegExp.$1.length == 1 ? e[d] : ("00" + e[d]).substr(("" + e[d]).length));
            }
        }
        return fmtString;
    };

    //日期格式化
    exp.date_format = exp.df = function (date, fmtString, flag) {
        date = this.parseDate(date);
        if (!date) {
            return "";
        }
        if (flag) {
            var s = new Date().getTime() / 1000 - date.getTime() / 1000;
            if (s > 0 && s < 3600) {
                return Math.ceil(s / 60) + "分钟前";
            } else if (s > 0 && s < 86400) {
                return Math.round(s / 3600) + "小时前";
            }
        }
        var e = {
            "M+": date.getMonth() + 1,
            "d+": date.getDate(),
            "h+": date.getHours(),
            "m+": date.getMinutes(),
            "s+": date.getSeconds(),
            "q+": Math.floor((date.getMonth() + 3) / 3),
            "S": date.getMilliseconds()
        };
        if (/(y+)/.test(fmtString)) {
            fmtString = fmtString.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
        }
        for (var d in e) {
            if (new RegExp("(" + d + ")").test(fmtString)) {
                fmtString = fmtString.replace(RegExp.$1, RegExp.$1.length == 1 ? e[d] : ("00" + e[d]).substr(("" + e[d]).length));
            }
        }
        return fmtString;
    };

    //获取相差天数
    exp.getDiffDay = function(startDate, endDate){
        if(arguments.length==1){
            endDate = startDate;
            startDate = new Date();
        }
        var d1 = exp.parseDate(startDate);
        var d2 = exp.parseDate(endDate);
        d1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
        d2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
        return (d2-d1)/86400000;
    };

    //获取某年某月的天数
    exp.getDayCount = function (y,m) {
        return new Date(y, m + 1, 0).getDate();
    };

    //获取周岁(严谨模式)
    exp.getRealFullYear = function (date) {
        if (/string|number/.test(typeof date)) {
            date = new Date(date);
        }
        var curDate = new Date();
        var y1 = date.getFullYear();
        var m1 = date.getMonth();
        var d1 = date.getDate();
        var n1 = this.getDayCount(y1,m1);
        var y2 = curDate.getFullYear();
        var m2 = curDate.getMonth();
        var d2 = curDate.getDate();
        var n2 = this.getDayCount(y2, m2);
        if (m1==1 && d1 == n1 && m2==1 && d2 == n2) {
            d1 = d2;
        }
        var year = y2 - y1;
        if(m2-m1<0 || m2-m1==0&&d2-d1<0){
            year--;
        }
        return year;
    };

    //获取周岁
    exp.getFullYear = function (date) {
        date = this.parseDate.apply(null,arguments);
        var curDate = new Date();
        var y1 = date.getFullYear();
        var m1 = date.getMonth();
        var d1 = date.getDate();
        var y2 = curDate.getFullYear();
        var m2 = curDate.getMonth();
        var d2 = curDate.getDate();
        var year = y2 - y1;
        if(m2-m1<0 || m2-m1==0&&d2-d1<0){
            year--;
        }
        return year;
    };

    //获取当前时间
    exp.now = function(date) {
        return formatTime(new Date());
    };


    /*=====================处理数组======================*/

    //获取某一项
    exp.item = function(arr, index){
        if(index<0) {
            index += arr.length;
        }
        return arr[index];
    };

    //数组求和
    exp.sum = function (arr) {
        return arr.length>0 ? arr.reduce(function (a, b) {
            return a + b;
        }) : 0;
    };

    //数组去重
    exp.unique = function(arr){
        var uniqueArr = [];
        for(var i=0; i<arr.length; i++){
            arr.indexOf(arr[i])==i && uniqueArr.push(arr[i]);
        }
        return uniqueArr;
    };

    //数组求和并格式化
    exp.SF = function (arr, bit) {
        return this.F(this.sum(arr).toFixed(2),bit);
    };

    //数组下多个key求和
    exp.sumList = function (arr) {
        var o = {};
        [].slice.call(argments,1).forEach(function (key) {
            o[key] = 0;
            arr.forEach(function (item) {
                o[key] += +item[key];
            });
        });
        return o;
    };


    /*=====================处理对象======================*/

    //清空对象
    exp.clear = function (obj) {
        for (var k in obj) {
            var v = obj[k];
            if (typeof v == "string") {
                obj[k] = "";
            }
            else if (typeof v == "number") {
                obj[k] = 0;
            }
            else if (typeof v == "object") {
                if (Array.isArray(v)) {
                    obj[k] = [];
                }
                else {
                    obj[k] = {};
                }
            }
            else if (typeof v == "boolean") {
                obj[k] = false;
            }
        }
    };

    //清空对象
    exp.clearObj = function(obj){
        for(var k in obj){
            obj[k] = "";
        }
    };

    //过滤
    exp.filter = function (obj, fun) {
        if (typeof fun == "string") {
            fun = new Function("$key", "$item", "return " + fun);
        }
        var newObj = {};
        for (var k in obj) {
            fun(k, obj[k]) && (newObj[k] = obj[k]);
        }
        return newObj;
    };



    //合并对象
    exp.mergeObj = function (This, ops) {
        for (var k in ops) {
            This[k] = ops[k];
        }
        return This;
    };

    //合并对象
    exp.mergeObj_deep = function (This, ops) {
        var defaults = This.ops || {};
        ops = ops || {};
        This.el = This.el || {};
        [defaults, ops].forEach(function (obj) {
            obj.el = obj.el || {};
            for (var k in obj) {
                if (k == "el") {
                    for (var name in obj.el) {
                        This.el[name] = $(obj.el[name]);
                    }
                }else if(/^el_(\w+)$/.test(k)){
                    This.el[Regexp.$1] = $(obj[k]);
                } else {
                    This[k] = obj[k];
                }
            }
        });
        return This;
    };

    //只保留某些key
    exp.only = function(obj){
        var arr = [].slice.call(arguments,1);
        var o = {};
        arr.forEach(function(kk){
            kk = kk.split("->");
            var k1 = kk[0];
            var k2 = kk[1] || kk[0];
            o[k1] = obj[k2];
        });
        return o;
    };

    //排除某些key
    exp.except = function(obj){
        var arr = [].slice.call(arguments,1);
        var o = {};
        for (var k in obj) {
            if(arr.indexOf(k)==-1) {
                o[k] = obj[k];
            }
        }
        return o;
    };

    //系列化
    exp.serialize = function (jsonObj) {
        var a = [];
        for(var key in jsonObj){
            a.push(key);
            a.push(jsonObj[key]);
        }
        return a.join("/");
    };

    //反系列化
    exp.deserialize = function (jsonStr){
        var jsonArr = typeof(jsonStr)=="string" ? jsonStr.split("/") : jsonStr;
        var o = {};
        for(var i=0; i< jsonArr.length; i+=2){
            o[jsonArr[i]] = jsonArr[i+1];
        }
        return o;
    };

    //是否纯对象
    exp.isPlainObject = function(v){
        return typeof(v)=="object" && !Array.isArray(v);
    };


    /*=====================处理其他======================*/

    //获取表单的值
    exp.getForm = function (form) {
        var o = {};
        form.find("select,input").each(function(i, obj){
            o[obj.name] = +obj.value;
        });
        return o;
    };

    //对象转成类的实例化
    exp.instantiation = function (o) {
        o.Class.prototype = o;
        return function (ops) {
            return new o.Class(ops);
        };
    };




});﻿/**
 * 页面切换效果
 */

//针对seajs
define("sys.transfer", function (req, exp) {
    "use strict";
    var $ = req("sys.lib.zepto");
    var move = req("sys.lib.move");

    //初始化
    exp.init = function (app) {
        exp.$box = app.$container;
        exp.box = app.container;
        exp.boxWidth = app.boxWidth;
        exp.boxHeight = app.boxHeight;

        exp.$box.css("position","relative").css("minHeight","100%").width(exp.boxWidth);
        //exp.setPanelStyle(exp.box.children[0]);
        exp.box.children[0] && exp.setPanelStyle(exp.box.children[0]);
    };

    //设置面板样式
    exp.setPanelStyle = function (obj) {
        $(obj).css({position:"absolute", minHeight: "100%", left:0, top:0}).width(exp.boxWidth);
    };

    //移动
    exp.move = function (oldPanel, newPanel, dir, aniDuration, callback) {
        var $oldPanel = $(oldPanel);
        var $newPanel = $(newPanel);
        exp.setPanelStyle(oldPanel); //新增,防止花屏
        exp.setPanelStyle(newPanel);

        if(dir=="forward") {
            $oldPanel.css("left",0);
            $newPanel.css("left",exp.boxWidth+"px");
        }else if(dir=="back") {
            $oldPanel.css("left",exp.boxWidth+"px");
            $newPanel.css("left",0);
        }

        var startX = ({forward: 0, back: -exp.boxWidth})[dir];
        var endX = ({forward: -exp.boxWidth, back: 0})[dir];

        exp.$box.width(exp.boxWidth * 2).attr("scrollTop",0)//.height(exp.boxHeight);
        //app.usegrid && grid.use(view.ui);
        move(exp.box).duration(0).x(startX).end(function () {
            move(exp.box).duration(aniDuration).x(endX).end(function () {
                /*
                $oldPanel.remove();
                */
                //为避免操作过快引起的bug,改为批量删除
                exp.$box.children().each(function(){
                    this.dataset.status = "del";
                });
                newPanel.dataset.status = "old";
                $("[data-status=del]",exp.box).remove();

                $newPanel.css("left",0);
                move(exp.box).duration(0).x(0).end();
                exp.$box.width(exp.boxWidth);
                if(newPanel.style.height!="100%"){
                    //exp.$box.height(newPanel.scrollHeight);
                }
                callback && callback();
            });
        });
    };
});/*csd*/
/*
 * move
 * Copyright(c) 2011 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */
(function (c) {
	var a = window.getComputedStyle || window.currentStyle;
	var d = {
		"top": "px",
		"bottom": "px",
		"left": "px",
		"right": "px",
		"width": "px",
		"height": "px",
		"font-size": "px",
		"margin": "px",
		"margin-top": "px",
		"margin-bottom": "px",
		"margin-left": "px",
		"margin-right": "px",
		"padding": "px",
		"padding-top": "px",
		"padding-bottom": "px",
		"padding-left": "px",
		"padding-right": "px"
	};
	c.move = function (e) {
		return new Move(move.select(e));
	};
	c.move.version = "0.0.3";
	move.defaults = {
		duration: 500
	};
	move.ease = {
		"in": "ease-in",
		"out": "ease-out",
		"in-out": "ease-in-out",
		"snap": "cubic-bezier(0,1,.5,1)",
		"linear": "cubic-bezier(0.250, 0.250, 0.750, 0.750)",
		"ease-in-quad": "cubic-bezier(0.550, 0.085, 0.680, 0.530)",
		"ease-in-cubic": "cubic-bezier(0.550, 0.055, 0.675, 0.190)",
		"ease-in-quart": "cubic-bezier(0.895, 0.030, 0.685, 0.220)",
		"ease-in-quint": "cubic-bezier(0.755, 0.050, 0.855, 0.060)",
		"ease-in-sine": "cubic-bezier(0.470, 0.000, 0.745, 0.715)",
		"ease-in-expo": "cubic-bezier(0.950, 0.050, 0.795, 0.035)",
		"ease-in-circ": "cubic-bezier(0.600, 0.040, 0.980, 0.335)",
		"ease-in-back": "cubic-bezier(0.600, -0.280, 0.735, 0.045)",
		"ease-out-quad": "cubic-bezier(0.250, 0.460, 0.450, 0.940)",
		"ease-out-cubic": "cubic-bezier(0.215, 0.610, 0.355, 1.000)",
		"ease-out-quart": "cubic-bezier(0.165, 0.840, 0.440, 1.000)",
		"ease-out-quint": "cubic-bezier(0.230, 1.000, 0.320, 1.000)",
		"ease-out-sine": "cubic-bezier(0.390, 0.575, 0.565, 1.000)",
		"ease-out-expo": "cubic-bezier(0.190, 1.000, 0.220, 1.000)",
		"ease-out-circ": "cubic-bezier(0.075, 0.820, 0.165, 1.000)",
		"ease-out-back": "cubic-bezier(0.175, 0.885, 0.320, 1.275)",
		"ease-out-quad": "cubic-bezier(0.455, 0.030, 0.515, 0.955)",
		"ease-out-cubic": "cubic-bezier(0.645, 0.045, 0.355, 1.000)",
		"ease-in-out-quart": "cubic-bezier(0.770, 0.000, 0.175, 1.000)",
		"ease-in-out-quint": "cubic-bezier(0.860, 0.000, 0.070, 1.000)",
		"ease-in-out-sine": "cubic-bezier(0.445, 0.050, 0.550, 0.950)",
		"ease-in-out-expo": "cubic-bezier(1.000, 0.000, 0.000, 1.000)",
		"ease-in-out-circ": "cubic-bezier(0.785, 0.135, 0.150, 0.860)",
		"ease-in-out-back": "cubic-bezier(0.680, -0.550, 0.265, 1.550)"
	};
	move.select = function (e) {
		if ("string" != typeof e) {
			return e;
		}
		return document.getElementById(e) || document.querySelectorAll(e)[0];
	};
	function b() {
		this.callbacks = {};
	}
	b.prototype.on = function (e, f) {
		(this.callbacks[e] = this.callbacks[e] || []).push(f);
		return this;
	};
	b.prototype.emit = function (g) {
		var e = Array.prototype.slice.call(arguments, 1),
		f = this.callbacks[g],
		j;
		if (f) {
			j = f.length;
			for (var h = 0; h < j; ++h) {
				f[h].apply(this, e);
			}
		}
		return this;
	};
	c.Move = function Move(e) {
		if (!(this instanceof Move)) {
			return new Move(e);
		}
		b.call(this);
		this.el = e;
		this._props = {};
		this._rotate = 0;
		this._transitionProps = [];
		this._transforms = [];
		this.duration(move.defaults.duration);
	};
	Move.prototype = new b;
	Move.prototype.constructor = Move;
	Move.prototype.transform = function (e) {
		this._transforms.push(e);
		return this;
	};
	Move.prototype.skew = function (e, f) {
		f = f || 0;
		return this.transform("skew(" + e + "deg, " + f + "deg)");
	};
	Move.prototype.skewX = function (e) {
		return this.transform("skewX(" + e + "deg)");
	};
	Move.prototype.skewY = function (e) {
		return this.transform("skewY(" + e + "deg)");
	};
	Move.prototype.translate = Move.prototype.to = function (e, f) {
		f = f || 0;
		return this.transform("translate(" + e + "px, " + f + "px)");
	};
	Move.prototype.translateX = Move.prototype.x = function (e) {
		return this.transform("translateX(" + e + "px)");
	};
	Move.prototype.translateY = Move.prototype.y = function (e) {
		return this.transform("translateY(" + e + "px)");
	};
	Move.prototype.scale = function (e, f) {
		f = null == f ? e : f;
		return this.transform("scale(" + e + ", " + f + ")");
	};
	Move.prototype.scaleX = function (e) {
		return this.transform("scaleX(" + e + ")");
	};
	Move.prototype.scaleY = function (e) {
		return this.transform("scaleY(" + e + ")");
	};
	Move.prototype.rotate = function (e) {
		return this.transform("rotate(" + e + "deg)");
	};
	Move.prototype.ease = function (e) {
		e = move.ease[e] || e || "ease";
		return this.setVendorProperty("transition-timing-function", e);
	};
	Move.prototype.animate = function (f, g) {
		for (var e in g) {
			if (g.hasOwnProperty(e)) {
				this.setVendorProperty("animation-" + e, g[e]);
			}
		}
		return this.setVendorProperty("animation-name", f);
	};
	Move.prototype.duration = function (e) {
		e = this._duration = "string" == typeof e ? parseFloat(e) * 1000 : e;
		return this.setVendorProperty("transition-duration", e + "ms");
	};
	Move.prototype.delay = function (e) {
		e = "string" == typeof e ? parseFloat(e) * 1000 : e;
		return this.setVendorProperty("transition-delay", e + "ms");
	};
	Move.prototype.setProperty = function (e, f) {
		this._props[e] = f;
		return this;
	};
	Move.prototype.setVendorProperty = function (e, f) {
		this.setProperty("-webkit-" + e, f);
		this.setProperty("-moz-" + e, f);
		this.setProperty("-ms-" + e, f);
		this.setProperty("-o-" + e, f);
		return this;
	};
	Move.prototype.set = function (e, f) {
		this.transition(e);
		if ("number" == typeof f && d[e]) {
			f += d[e];
		}
		this._props[e] = f;
		return this;
	};
	Move.prototype.add = function (e, g) {
		if (!a) {
			return;
		}
		var f = this;
		return this.on("start",
		function () {
			var h = parseInt(f.current(e), 10);
			f.set(e, h + g + "px");
		});
	};
	Move.prototype.sub = function (e, g) {
		if (!a) {
			return;
		}
		var f = this;
		return this.on("start",
		function () {
			var h = parseInt(f.current(e), 10);
			f.set(e, h - g + "px");
		});
	};
	Move.prototype.current = function (e) {
		return a(this.el).getPropertyValue(e);
	};
	Move.prototype.transition = function (e) {
		if (!this._transitionProps.indexOf(e)) {
			return this;
		}
		this._transitionProps.push(e);
		return this;
	};
	Move.prototype.applyProperties = function () {
		var g = this._props,
		e = this.el;
		for (var f in g) {
			if (g.hasOwnProperty(f)) {
				e.style.setProperty(f, g[f], "");
			}
		}
		return this;
	};
	Move.prototype.move = Move.prototype.select = function (e) {
		this.el = move.select(e);
		return this;
	};
	Move.prototype.then = function (f) {
		if (f instanceof Move) {
			this.on("end",
			function () {
				f.end();
			});
		} else {
			if ("function" == typeof f) {
				this.on("end", f);
			} else {
				var e = new Move(this.el);
				e._transforms = this._transforms.slice(0);
				this.then(e);
				e.parent = this;
				return e;
			}
		}
		return this;
	};
	Move.prototype.pop = function () {
		return this.parent;
	};
	Move.prototype.end = function (e) {
		var f = this;
		this.emit("start");
		if (this._transforms.length) {
			this.setVendorProperty("transform", this._transforms.join(" "));
		}
		this.setVendorProperty("transition-properties", this._transitionProps.join(", "));
		this.applyProperties();
		if (e) {
			this.then(e);
		}
		setTimeout(function () {
			f.emit("end");
		},
		this._duration);
		return this;
	};


	if (typeof define === "function" && (define.amd||define.cmd) ) {
		define("sys.lib.move", function (require,exports,module) {
			module.exports = c.move;
		});
	}
})(this);/**
 * Created by gao on 15/12/1.
 */
define("root.config", function(req, exp){
    "use strict";

    var $ = req("jquery");
    var app = req("sys.app");

    //AJAX设置
    exp.ajaxSetup = function() {
        $.ajaxSetup({
            global: true,
            cache: false,
            dataType: "JSON",
            timeout: 60000,
            beforeSend: function (xhr) {
                app.plugin.mask.showMask({
                    loading: true,
                    bg: "#fff",
                    opacity: 0
                });
                xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
                xhr.setRequestHeader("sessionId",sessionStorage.sessionId);
                xhr.setRequestHeader("adminUserId",sessionStorage.adminUserId);
            },
            complete: function (rs) {
                app.plugin.mask.hide();
            },
            error: function (rs) {
                if (rs.status == 403) {
                    app.viewEx.alert("403错误");
                } else if (rs.status == 404) {
                    console.warn("找不到nodejs服务或nodejs未启动");
                    app.viewEx.alert("服务器错误");
                } else if (rs.statusText == "timeout") {
                    app.viewEx.alert("请求超时,请刷新页面！");
                } else if (rs.statusText == "error") {
                    app.viewEx.alert("500服务器错误！");
                } else {
                    app.viewEx.alert("网络错误");
                }
            }
        });
    };

    //AJAX数据处理
    exp.ajaxRes = function(callback, params){
        return function(rs){
           if(rs.code==500){
                app.viewEx.alert("500服务器错误！");
            } else{
                if(params && params.data && rs.data){
                    params.data = rs.data;
                }
                callback({status:rs.status, codes:rs.codes||rs.code, msg:rs.msg||rs.message, data:rs.data});
            }
        }
    };

});/*csd*//* jQuery v2.0.3 | (c) 2005, 2013 jQuery Foundation, Inc. | jquery.org/license
//@ sourceMapping
URL=jquery-2.0.3.min.map
*/
(function(e,undefined){var t,n,r=typeof undefined,i=e.location,o=e.document,s=o.documentElement,a=e.jQuery,u=e.$,l={},c=[],p="2.0.3",f=c.concat,h=c.push,d=c.slice,g=c.indexOf,m=l.toString,y=l.hasOwnProperty,v=p.trim,x=function(e,n){return new x.fn.init(e,n,t);},b=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,w=/\S+/g,T=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,C=/^<(\w+)\s*\/?>(?:<\/\1>|)$/,k=/^-ms-/,N=/-([\da-z])/gi,E=function(e,t){return t.toUpperCase();},S=function(){o.removeEventListener("DOMContentLoaded",S,!1),e.removeEventListener("load",S,!1),x.ready();};x.fn=x.prototype={jquery:p,constructor:x,init:function(e,t,n){var r,i;if(!e){return this;}if("string"==typeof e){if(r="<"===e.charAt(0)&&">"===e.charAt(e.length-1)&&e.length>=3?[null,e,null]:T.exec(e),!r||!r[1]&&t){return !t||t.jquery?(t||n).find(e):this.constructor(t).find(e);}if(r[1]){if(t=t instanceof x?t[0]:t,x.merge(this,x.parseHTML(r[1],t&&t.nodeType?t.ownerDocument||t:o,!0)),C.test(r[1])&&x.isPlainObject(t)){for(r in t){x.isFunction(this[r])?this[r](t[r]):this.attr(r,t[r]);}}return this;}return i=o.getElementById(r[2]),i&&i.parentNode&&(this.length=1,this[0]=i),this.context=o,this.selector=e,this;}return e.nodeType?(this.context=this[0]=e,this.length=1,this):x.isFunction(e)?n.ready(e):(e.selector!==undefined&&(this.selector=e.selector,this.context=e.context),x.makeArray(e,this));},selector:"",length:0,toArray:function(){return d.call(this);},get:function(e){return null==e?this.toArray():0>e?this[this.length+e]:this[e];},pushStack:function(e){var t=x.merge(this.constructor(),e);return t.prevObject=this,t.context=this.context,t;},each:function(e,t){return x.each(this,e,t);},ready:function(e){return x.ready.promise().done(e),this;},slice:function(){return this.pushStack(d.apply(this,arguments));},first:function(){return this.eq(0);},last:function(){return this.eq(-1);},eq:function(e){var t=this.length,n=+e+(0>e?t:0);return this.pushStack(n>=0&&t>n?[this[n]]:[]);},map:function(e){return this.pushStack(x.map(this,function(t,n){return e.call(t,n,t);}));},end:function(){return this.prevObject||this.constructor(null);},push:h,sort:[].sort,splice:[].splice},x.fn.init.prototype=x.fn,x.extend=x.fn.extend=function(){var e,t,n,r,i,o,s=arguments[0]||{},a=1,u=arguments.length,l=!1;for("boolean"==typeof s&&(l=s,s=arguments[1]||{},a=2),"object"==typeof s||x.isFunction(s)||(s={}),u===a&&(s=this,--a);u>a;a++){if(null!=(e=arguments[a])){for(t in e){n=s[t],r=e[t],s!==r&&(l&&r&&(x.isPlainObject(r)||(i=x.isArray(r)))?(i?(i=!1,o=n&&x.isArray(n)?n:[]):o=n&&x.isPlainObject(n)?n:{},s[t]=x.extend(l,o,r)):r!==undefined&&(s[t]=r));}}}return s;},x.extend({expando:"jQuery"+(p+Math.random()).replace(/\D/g,""),noConflict:function(t){return e.$===x&&(e.$=u),t&&e.jQuery===x&&(e.jQuery=a),x;},isReady:!1,readyWait:1,holdReady:function(e){e?x.readyWait++:x.ready(!0);},ready:function(e){(e===!0?--x.readyWait:x.isReady)||(x.isReady=!0,e!==!0&&--x.readyWait>0||(n.resolveWith(o,[x]),x.fn.trigger&&x(o).trigger("ready").off("ready")));},isFunction:function(e){return"function"===x.type(e);},isArray:Array.isArray,isWindow:function(e){return null!=e&&e===e.window;},isNumeric:function(e){return !isNaN(parseFloat(e))&&isFinite(e);},type:function(e){return null==e?e+"":"object"==typeof e||"function"==typeof e?l[m.call(e)]||"object":typeof e;},isPlainObject:function(e){if("object"!==x.type(e)||e.nodeType||x.isWindow(e)){return !1;}try{if(e.constructor&&!y.call(e.constructor.prototype,"isPrototypeOf")){return !1;}}catch(t){return !1;}return !0;},isEmptyObject:function(e){var t;for(t in e){return !1;}return !0;},error:function(e){throw Error(e);},parseHTML:function(e,t,n){if(!e||"string"!=typeof e){return null;}"boolean"==typeof t&&(n=t,t=!1),t=t||o;var r=C.exec(e),i=!n&&[];return r?[t.createElement(r[1])]:(r=x.buildFragment([e],t,i),i&&x(i).remove(),x.merge([],r.childNodes));},parseJSON:JSON.parse,parseXML:function(e){var t,n;if(!e||"string"!=typeof e){return null;}try{n=new DOMParser,t=n.parseFromString(e,"text/xml");}catch(r){t=undefined;}return(!t||t.getElementsByTagName("parsererror").length)&&x.error("Invalid XML: "+e),t;},noop:function(){},globalEval:function(e){var t,n=eval;e=x.trim(e),e&&(1===e.indexOf("use strict")?(t=o.createElement("script"),t.text=e,o.head.appendChild(t).parentNode.removeChild(t)):n(e));},camelCase:function(e){return e.replace(k,"ms-").replace(N,E);},nodeName:function(e,t){return e.nodeName&&e.nodeName.toLowerCase()===t.toLowerCase();},each:function(e,t,n){var r,i=0,o=e.length,s=j(e);if(n){if(s){for(;o>i;i++){if(r=t.apply(e[i],n),r===!1){break;}}}else{for(i in e){if(r=t.apply(e[i],n),r===!1){break;}}}}else{if(s){for(;o>i;i++){if(r=t.call(e[i],i,e[i]),r===!1){break;}}}else{for(i in e){if(r=t.call(e[i],i,e[i]),r===!1){break;}}}}return e;},trim:function(e){return null==e?"":v.call(e);},makeArray:function(e,t){var n=t||[];return null!=e&&(j(Object(e))?x.merge(n,"string"==typeof e?[e]:e):h.call(n,e)),n;},inArray:function(e,t,n){return null==t?-1:g.call(t,e,n);},merge:function(e,t){var n=t.length,r=e.length,i=0;if("number"==typeof n){for(;n>i;i++){e[r++]=t[i];}}else{while(t[i]!==undefined){e[r++]=t[i++];}}return e.length=r,e;},grep:function(e,t,n){var r,i=[],o=0,s=e.length;for(n=!!n;s>o;o++){r=!!t(e[o],o),n!==r&&i.push(e[o]);}return i;},map:function(e,t,n){var r,i=0,o=e.length,s=j(e),a=[];if(s){for(;o>i;i++){r=t(e[i],i,n),null!=r&&(a[a.length]=r);}}else{for(i in e){r=t(e[i],i,n),null!=r&&(a[a.length]=r);}}return f.apply([],a);},guid:1,proxy:function(e,t){var n,r,i;return"string"==typeof t&&(n=e[t],t=e,e=n),x.isFunction(e)?(r=d.call(arguments,2),i=function(){return e.apply(t||this,r.concat(d.call(arguments)));},i.guid=e.guid=e.guid||x.guid++,i):undefined;},access:function(e,t,n,r,i,o,s){var a=0,u=e.length,l=null==n;if("object"===x.type(n)){i=!0;for(a in n){x.access(e,t,a,n[a],!0,o,s);}}else{if(r!==undefined&&(i=!0,x.isFunction(r)||(s=!0),l&&(s?(t.call(e,r),t=null):(l=t,t=function(e,t,n){return l.call(x(e),n);})),t)){for(;u>a;a++){t(e[a],n,s?r:r.call(e[a],a,t(e[a],n)));}}}return i?e:l?t.call(e):u?t(e[0],n):o;},now:Date.now,swap:function(e,t,n,r){var i,o,s={};for(o in t){s[o]=e.style[o],e.style[o]=t[o];}i=n.apply(e,r||[]);for(o in t){e.style[o]=s[o];}return i;}}),x.ready.promise=function(t){return n||(n=x.Deferred(),"complete"===o.readyState?setTimeout(x.ready):(o.addEventListener("DOMContentLoaded",S,!1),e.addEventListener("load",S,!1))),n.promise(t);},x.each("Boolean Number String Function Array Date RegExp Object Error".split(" "),function(e,t){l["[object "+t+"]"]=t.toLowerCase();});function j(e){var t=e.length,n=x.type(e);return x.isWindow(e)?!1:1===e.nodeType&&t?!0:"array"===n||"function"!==n&&(0===t||"number"==typeof t&&t>0&&t-1 in e);}t=x(o),function(e,undefined){var t,n,r,i,o,s,a,u,l,c,p,f,h,d,g,m,y,v="sizzle"+-new Date,b=e.document,w=0,T=0,C=st(),k=st(),N=st(),E=!1,S=function(e,t){return e===t?(E=!0,0):0;},j=typeof undefined,D=1<<31,A={}.hasOwnProperty,L=[],q=L.pop,H=L.push,O=L.push,F=L.slice,P=L.indexOf||function(e){var t=0,n=this.length;for(;n>t;t++){if(this[t]===e){return t;}}return -1;},R="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",M="[\\x20\\t\\r\\n\\f]",W="(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",$=W.replace("w","w#"),B="\\["+M+"*("+W+")"+M+"*(?:([*^$|!~]?=)"+M+"*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|("+$+")|)|)"+M+"*\\]",I=":("+W+")(?:\\(((['\"])((?:\\\\.|[^\\\\])*?)\\3|((?:\\\\.|[^\\\\()[\\]]|"+B.replace(3,8)+")*)|.*)\\)|)",z=RegExp("^"+M+"+|((?:^|[^\\\\])(?:\\\\.)*)"+M+"+$","g"),_=RegExp("^"+M+"*,"+M+"*"),X=RegExp("^"+M+"*([>+~]|"+M+")"+M+"*"),U=RegExp(M+"*[+~]"),Y=RegExp("="+M+"*([^\\]'\"]*)"+M+"*\\]","g"),V=RegExp(I),G=RegExp("^"+$+"$"),J={ID:RegExp("^#("+W+")"),CLASS:RegExp("^\\.("+W+")"),TAG:RegExp("^("+W.replace("w","w*")+")"),ATTR:RegExp("^"+B),PSEUDO:RegExp("^"+I),CHILD:RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+M+"*(even|odd|(([+-]|)(\\d*)n|)"+M+"*(?:([+-]|)"+M+"*(\\d+)|))"+M+"*\\)|)","i"),bool:RegExp("^(?:"+R+")$","i"),needsContext:RegExp("^"+M+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+M+"*((?:-\\d)?\\d*)"+M+"*\\)|)(?=[^-]|$)","i")},Q=/^[^{]+\{\s*\[native \w/,K=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,Z=/^(?:input|select|textarea|button)$/i,et=/^h\d$/i,tt=/'|\\/g,nt=RegExp("\\\\([\\da-f]{1,6}"+M+"?|("+M+")|.)","ig"),rt=function(e,t,n){var r="0x"+t-65536;return r!==r||n?t:0>r?String.fromCharCode(r+65536):String.fromCharCode(55296|r>>10,56320|1023&r);};try{O.apply(L=F.call(b.childNodes),b.childNodes),L[b.childNodes.length].nodeType;}catch(it){O={apply:L.length?function(e,t){H.apply(e,F.call(t));}:function(e,t){var n=e.length,r=0;while(e[n++]=t[r++]){}e.length=n-1;}};}function ot(e,t,r,i){var o,s,a,u,l,f,g,m,x,w;if((t?t.ownerDocument||t:b)!==p&&c(t),t=t||p,r=r||[],!e||"string"!=typeof e){return r;}if(1!==(u=t.nodeType)&&9!==u){return[];}if(h&&!i){if(o=K.exec(e)){if(a=o[1]){if(9===u){if(s=t.getElementById(a),!s||!s.parentNode){return r;}if(s.id===a){return r.push(s),r;}}else{if(t.ownerDocument&&(s=t.ownerDocument.getElementById(a))&&y(t,s)&&s.id===a){return r.push(s),r;}}}else{if(o[2]){return O.apply(r,t.getElementsByTagName(e)),r;}if((a=o[3])&&n.getElementsByClassName&&t.getElementsByClassName){return O.apply(r,t.getElementsByClassName(a)),r;}}}if(n.qsa&&(!d||!d.test(e))){if(m=g=v,x=t,w=9===u&&e,1===u&&"object"!==t.nodeName.toLowerCase()){f=gt(e),(g=t.getAttribute("id"))?m=g.replace(tt,"\\$&"):t.setAttribute("id",m),m="[id='"+m+"'] ",l=f.length;while(l--){f[l]=m+mt(f[l]);}x=U.test(e)&&t.parentNode||t,w=f.join(",");}if(w){try{return O.apply(r,x.querySelectorAll(w)),r;}catch(T){}finally{g||t.removeAttribute("id");}}}}return kt(e.replace(z,"$1"),t,r,i);}function st(){var e=[];function t(n,r){return e.push(n+=" ")>i.cacheLength&&delete t[e.shift()],t[n]=r;}return t;}function at(e){return e[v]=!0,e;}function ut(e){var t=p.createElement("div");try{return !!e(t);}catch(n){return !1;}finally{t.parentNode&&t.parentNode.removeChild(t),t=null;}}function lt(e,t){var n=e.split("|"),r=e.length;while(r--){i.attrHandle[n[r]]=t;}}function ct(e,t){var n=t&&e,r=n&&1===e.nodeType&&1===t.nodeType&&(~t.sourceIndex||D)-(~e.sourceIndex||D);if(r){return r;}if(n){while(n=n.nextSibling){if(n===t){return -1;}}}return e?1:-1;}function pt(e){return function(t){var n=t.nodeName.toLowerCase();return"input"===n&&t.type===e;};}function ft(e){return function(t){var n=t.nodeName.toLowerCase();return("input"===n||"button"===n)&&t.type===e;};}function ht(e){return at(function(t){return t=+t,at(function(n,r){var i,o=e([],n.length,t),s=o.length;while(s--){n[i=o[s]]&&(n[i]=!(r[i]=n[i]));}});});}s=ot.isXML=function(e){var t=e&&(e.ownerDocument||e).documentElement;return t?"HTML"!==t.nodeName:!1;},n=ot.support={},c=ot.setDocument=function(e){var t=e?e.ownerDocument||e:b,r=t.defaultView;return t!==p&&9===t.nodeType&&t.documentElement?(p=t,f=t.documentElement,h=!s(t),r&&r.attachEvent&&r!==r.top&&r.attachEvent("onbeforeunload",function(){c();}),n.attributes=ut(function(e){return e.className="i",!e.getAttribute("className");}),n.getElementsByTagName=ut(function(e){return e.appendChild(t.createComment("")),!e.getElementsByTagName("*").length;}),n.getElementsByClassName=ut(function(e){return e.innerHTML="<div class='a'></div><div class='a i'></div>",e.firstChild.className="i",2===e.getElementsByClassName("i").length;}),n.getById=ut(function(e){return f.appendChild(e).id=v,!t.getElementsByName||!t.getElementsByName(v).length;}),n.getById?(i.find.ID=function(e,t){if(typeof t.getElementById!==j&&h){var n=t.getElementById(e);return n&&n.parentNode?[n]:[];}},i.filter.ID=function(e){var t=e.replace(nt,rt);return function(e){return e.getAttribute("id")===t;};}):(delete i.find.ID,i.filter.ID=function(e){var t=e.replace(nt,rt);return function(e){var n=typeof e.getAttributeNode!==j&&e.getAttributeNode("id");return n&&n.value===t;};}),i.find.TAG=n.getElementsByTagName?function(e,t){return typeof t.getElementsByTagName!==j?t.getElementsByTagName(e):undefined;}:function(e,t){var n,r=[],i=0,o=t.getElementsByTagName(e);if("*"===e){while(n=o[i++]){1===n.nodeType&&r.push(n);}return r;}return o;},i.find.CLASS=n.getElementsByClassName&&function(e,t){return typeof t.getElementsByClassName!==j&&h?t.getElementsByClassName(e):undefined;},g=[],d=[],(n.qsa=Q.test(t.querySelectorAll))&&(ut(function(e){e.innerHTML="<select><option selected=''></option></select>",e.querySelectorAll("[selected]").length||d.push("\\["+M+"*(?:value|"+R+")"),e.querySelectorAll(":checked").length||d.push(":checked");}),ut(function(e){var n=t.createElement("input");n.setAttribute("type","hidden"),e.appendChild(n).setAttribute("t",""),e.querySelectorAll("[t^='']").length&&d.push("[*^$]="+M+"*(?:''|\"\")"),e.querySelectorAll(":enabled").length||d.push(":enabled",":disabled"),e.querySelectorAll("*,:x"),d.push(",.*:");})),(n.matchesSelector=Q.test(m=f.webkitMatchesSelector||f.mozMatchesSelector||f.oMatchesSelector||f.msMatchesSelector))&&ut(function(e){n.disconnectedMatch=m.call(e,"div"),m.call(e,"[s!='']:x"),g.push("!=",I);}),d=d.length&&RegExp(d.join("|")),g=g.length&&RegExp(g.join("|")),y=Q.test(f.contains)||f.compareDocumentPosition?function(e,t){var n=9===e.nodeType?e.documentElement:e,r=t&&t.parentNode;return e===r||!(!r||1!==r.nodeType||!(n.contains?n.contains(r):e.compareDocumentPosition&&16&e.compareDocumentPosition(r)));}:function(e,t){if(t){while(t=t.parentNode){if(t===e){return !0;}}}return !1;},S=f.compareDocumentPosition?function(e,r){if(e===r){return E=!0,0;}var i=r.compareDocumentPosition&&e.compareDocumentPosition&&e.compareDocumentPosition(r);return i?1&i||!n.sortDetached&&r.compareDocumentPosition(e)===i?e===t||y(b,e)?-1:r===t||y(b,r)?1:l?P.call(l,e)-P.call(l,r):0:4&i?-1:1:e.compareDocumentPosition?-1:1;}:function(e,n){var r,i=0,o=e.parentNode,s=n.parentNode,a=[e],u=[n];if(e===n){return E=!0,0;}if(!o||!s){return e===t?-1:n===t?1:o?-1:s?1:l?P.call(l,e)-P.call(l,n):0;}if(o===s){return ct(e,n);}r=e;while(r=r.parentNode){a.unshift(r);}r=n;while(r=r.parentNode){u.unshift(r);}while(a[i]===u[i]){i++;}return i?ct(a[i],u[i]):a[i]===b?-1:u[i]===b?1:0;},t):p;},ot.matches=function(e,t){return ot(e,null,null,t);},ot.matchesSelector=function(e,t){if((e.ownerDocument||e)!==p&&c(e),t=t.replace(Y,"='$1']"),!(!n.matchesSelector||!h||g&&g.test(t)||d&&d.test(t))){try{var r=m.call(e,t);if(r||n.disconnectedMatch||e.document&&11!==e.document.nodeType){return r;}}catch(i){}}return ot(t,p,null,[e]).length>0;},ot.contains=function(e,t){return(e.ownerDocument||e)!==p&&c(e),y(e,t);},ot.attr=function(e,t){(e.ownerDocument||e)!==p&&c(e);var r=i.attrHandle[t.toLowerCase()],o=r&&A.call(i.attrHandle,t.toLowerCase())?r(e,t,!h):undefined;return o===undefined?n.attributes||!h?e.getAttribute(t):(o=e.getAttributeNode(t))&&o.specified?o.value:null:o;},ot.error=function(e){throw Error("Syntax error, unrecognized expression: "+e);},ot.uniqueSort=function(e){var t,r=[],i=0,o=0;if(E=!n.detectDuplicates,l=!n.sortStable&&e.slice(0),e.sort(S),E){while(t=e[o++]){t===e[o]&&(i=r.push(o));}while(i--){e.splice(r[i],1);}}return e;},o=ot.getText=function(e){var t,n="",r=0,i=e.nodeType;if(i){if(1===i||9===i||11===i){if("string"==typeof e.textContent){return e.textContent;}for(e=e.firstChild;e;e=e.nextSibling){n+=o(e);}}else{if(3===i||4===i){return e.nodeValue;}}}else{for(;t=e[r];r++){n+=o(t);}}return n;},i=ot.selectors={cacheLength:50,createPseudo:at,match:J,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(e){return e[1]=e[1].replace(nt,rt),e[3]=(e[4]||e[5]||"").replace(nt,rt),"~="===e[2]&&(e[3]=" "+e[3]+" "),e.slice(0,4);},CHILD:function(e){return e[1]=e[1].toLowerCase(),"nth"===e[1].slice(0,3)?(e[3]||ot.error(e[0]),e[4]=+(e[4]?e[5]+(e[6]||1):2*("even"===e[3]||"odd"===e[3])),e[5]=+(e[7]+e[8]||"odd"===e[3])):e[3]&&ot.error(e[0]),e;},PSEUDO:function(e){var t,n=!e[5]&&e[2];return J.CHILD.test(e[0])?null:(e[3]&&e[4]!==undefined?e[2]=e[4]:n&&V.test(n)&&(t=gt(n,!0))&&(t=n.indexOf(")",n.length-t)-n.length)&&(e[0]=e[0].slice(0,t),e[2]=n.slice(0,t)),e.slice(0,3));}},filter:{TAG:function(e){var t=e.replace(nt,rt).toLowerCase();return"*"===e?function(){return !0;}:function(e){return e.nodeName&&e.nodeName.toLowerCase()===t;};},CLASS:function(e){var t=C[e+" "];return t||(t=RegExp("(^|"+M+")"+e+"("+M+"|$)"))&&C(e,function(e){return t.test("string"==typeof e.className&&e.className||typeof e.getAttribute!==j&&e.getAttribute("class")||"");});},ATTR:function(e,t,n){return function(r){var i=ot.attr(r,e);return null==i?"!="===t:t?(i+="","="===t?i===n:"!="===t?i!==n:"^="===t?n&&0===i.indexOf(n):"*="===t?n&&i.indexOf(n)>-1:"$="===t?n&&i.slice(-n.length)===n:"~="===t?(" "+i+" ").indexOf(n)>-1:"|="===t?i===n||i.slice(0,n.length+1)===n+"-":!1):!0;};},CHILD:function(e,t,n,r,i){var o="nth"!==e.slice(0,3),s="last"!==e.slice(-4),a="of-type"===t;return 1===r&&0===i?function(e){return !!e.parentNode;}:function(t,n,u){var l,c,p,f,h,d,g=o!==s?"nextSibling":"previousSibling",m=t.parentNode,y=a&&t.nodeName.toLowerCase(),x=!u&&!a;if(m){if(o){while(g){p=t;while(p=p[g]){if(a?p.nodeName.toLowerCase()===y:1===p.nodeType){return !1;}}d=g="only"===e&&!d&&"nextSibling";}return !0;}if(d=[s?m.firstChild:m.lastChild],s&&x){c=m[v]||(m[v]={}),l=c[e]||[],h=l[0]===w&&l[1],f=l[0]===w&&l[2],p=h&&m.childNodes[h];while(p=++h&&p&&p[g]||(f=h=0)||d.pop()){if(1===p.nodeType&&++f&&p===t){c[e]=[w,h,f];break;}}}else{if(x&&(l=(t[v]||(t[v]={}))[e])&&l[0]===w){f=l[1];}else{while(p=++h&&p&&p[g]||(f=h=0)||d.pop()){if((a?p.nodeName.toLowerCase()===y:1===p.nodeType)&&++f&&(x&&((p[v]||(p[v]={}))[e]=[w,f]),p===t)){break;}}}}return f-=i,f===r||0===f%r&&f/r>=0;}};},PSEUDO:function(e,t){var n,r=i.pseudos[e]||i.setFilters[e.toLowerCase()]||ot.error("unsupported pseudo: "+e);return r[v]?r(t):r.length>1?(n=[e,e,"",t],i.setFilters.hasOwnProperty(e.toLowerCase())?at(function(e,n){var i,o=r(e,t),s=o.length;while(s--){i=P.call(e,o[s]),e[i]=!(n[i]=o[s]);}}):function(e){return r(e,0,n);}):r;}},pseudos:{not:at(function(e){var t=[],n=[],r=a(e.replace(z,"$1"));return r[v]?at(function(e,t,n,i){var o,s=r(e,null,i,[]),a=e.length;while(a--){(o=s[a])&&(e[a]=!(t[a]=o));}}):function(e,i,o){return t[0]=e,r(t,null,o,n),!n.pop();};}),has:at(function(e){return function(t){return ot(e,t).length>0;};}),contains:at(function(e){return function(t){return(t.textContent||t.innerText||o(t)).indexOf(e)>-1;};}),lang:at(function(e){return G.test(e||"")||ot.error("unsupported lang: "+e),e=e.replace(nt,rt).toLowerCase(),function(t){var n;do{if(n=h?t.lang:t.getAttribute("xml:lang")||t.getAttribute("lang")){return n=n.toLowerCase(),n===e||0===n.indexOf(e+"-");}}while((t=t.parentNode)&&1===t.nodeType);return !1;};}),target:function(t){var n=e.location&&e.location.hash;return n&&n.slice(1)===t.id;},root:function(e){return e===f;},focus:function(e){return e===p.activeElement&&(!p.hasFocus||p.hasFocus())&&!!(e.type||e.href||~e.tabIndex);},enabled:function(e){return e.disabled===!1;},disabled:function(e){return e.disabled===!0;},checked:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&!!e.checked||"option"===t&&!!e.selected;},selected:function(e){return e.parentNode&&e.parentNode.selectedIndex,e.selected===!0;},empty:function(e){for(e=e.firstChild;e;e=e.nextSibling){if(e.nodeName>"@"||3===e.nodeType||4===e.nodeType){return !1;}}return !0;},parent:function(e){return !i.pseudos.empty(e);},header:function(e){return et.test(e.nodeName);},input:function(e){return Z.test(e.nodeName);},button:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&"button"===e.type||"button"===t;},text:function(e){var t;return"input"===e.nodeName.toLowerCase()&&"text"===e.type&&(null==(t=e.getAttribute("type"))||t.toLowerCase()===e.type);},first:ht(function(){return[0];}),last:ht(function(e,t){return[t-1];}),eq:ht(function(e,t,n){return[0>n?n+t:n];}),even:ht(function(e,t){var n=0;for(;t>n;n+=2){e.push(n);}return e;}),odd:ht(function(e,t){var n=1;for(;t>n;n+=2){e.push(n);}return e;}),lt:ht(function(e,t,n){var r=0>n?n+t:n;for(;--r>=0;){e.push(r);}return e;}),gt:ht(function(e,t,n){var r=0>n?n+t:n;for(;t>++r;){e.push(r);}return e;})}},i.pseudos.nth=i.pseudos.eq;for(t in {radio:!0,checkbox:!0,file:!0,password:!0,image:!0}){i.pseudos[t]=pt(t);}for(t in {submit:!0,reset:!0}){i.pseudos[t]=ft(t);}function dt(){}dt.prototype=i.filters=i.pseudos,i.setFilters=new dt;function gt(e,t){var n,r,o,s,a,u,l,c=k[e+" "];if(c){return t?0:c.slice(0);}a=e,u=[],l=i.preFilter;while(a){(!n||(r=_.exec(a)))&&(r&&(a=a.slice(r[0].length)||a),u.push(o=[])),n=!1,(r=X.exec(a))&&(n=r.shift(),o.push({value:n,type:r[0].replace(z," ")}),a=a.slice(n.length));for(s in i.filter){!(r=J[s].exec(a))||l[s]&&!(r=l[s](r))||(n=r.shift(),o.push({value:n,type:s,matches:r}),a=a.slice(n.length));}if(!n){break;}}return t?a.length:a?ot.error(e):k(e,u).slice(0);}function mt(e){var t=0,n=e.length,r="";for(;n>t;t++){r+=e[t].value;}return r;}function yt(e,t,n){var i=t.dir,o=n&&"parentNode"===i,s=T++;return t.first?function(t,n,r){while(t=t[i]){if(1===t.nodeType||o){return e(t,n,r);}}}:function(t,n,a){var u,l,c,p=w+" "+s;if(a){while(t=t[i]){if((1===t.nodeType||o)&&e(t,n,a)){return !0;}}}else{while(t=t[i]){if(1===t.nodeType||o){if(c=t[v]||(t[v]={}),(l=c[i])&&l[0]===p){if((u=l[1])===!0||u===r){return u===!0;}}else{if(l=c[i]=[p],l[1]=e(t,n,a)||r,l[1]===!0){return !0;}}}}}};}function vt(e){return e.length>1?function(t,n,r){var i=e.length;while(i--){if(!e[i](t,n,r)){return !1;}}return !0;}:e[0];}function xt(e,t,n,r,i){var o,s=[],a=0,u=e.length,l=null!=t;for(;u>a;a++){(o=e[a])&&(!n||n(o,r,i))&&(s.push(o),l&&t.push(a));}return s;}function bt(e,t,n,r,i,o){return r&&!r[v]&&(r=bt(r)),i&&!i[v]&&(i=bt(i,o)),at(function(o,s,a,u){var l,c,p,f=[],h=[],d=s.length,g=o||Ct(t||"*",a.nodeType?[a]:a,[]),m=!e||!o&&t?g:xt(g,f,e,a,u),y=n?i||(o?e:d||r)?[]:s:m;if(n&&n(m,y,a,u),r){l=xt(y,h),r(l,[],a,u),c=l.length;while(c--){(p=l[c])&&(y[h[c]]=!(m[h[c]]=p));}}if(o){if(i||e){if(i){l=[],c=y.length;while(c--){(p=y[c])&&l.push(m[c]=p);}i(null,y=[],l,u);}c=y.length;while(c--){(p=y[c])&&(l=i?P.call(o,p):f[c])>-1&&(o[l]=!(s[l]=p));}}}else{y=xt(y===s?y.splice(d,y.length):y),i?i(null,s,y,u):O.apply(s,y);}});}function wt(e){var t,n,r,o=e.length,s=i.relative[e[0].type],a=s||i.relative[" "],l=s?1:0,c=yt(function(e){return e===t;},a,!0),p=yt(function(e){return P.call(t,e)>-1;},a,!0),f=[function(e,n,r){return !s&&(r||n!==u)||((t=n).nodeType?c(e,n,r):p(e,n,r));}];for(;o>l;l++){if(n=i.relative[e[l].type]){f=[yt(vt(f),n)];}else{if(n=i.filter[e[l].type].apply(null,e[l].matches),n[v]){for(r=++l;o>r;r++){if(i.relative[e[r].type]){break;}}return bt(l>1&&vt(f),l>1&&mt(e.slice(0,l-1).concat({value:" "===e[l-2].type?"*":""})).replace(z,"$1"),n,r>l&&wt(e.slice(l,r)),o>r&&wt(e=e.slice(r)),o>r&&mt(e));}f.push(n);}}return vt(f);}function Tt(e,t){var n=0,o=t.length>0,s=e.length>0,a=function(a,l,c,f,h){var d,g,m,y=[],v=0,x="0",b=a&&[],T=null!=h,C=u,k=a||s&&i.find.TAG("*",h&&l.parentNode||l),N=w+=null==C?1:Math.random()||0.1;for(T&&(u=l!==p&&l,r=n);null!=(d=k[x]);x++){if(s&&d){g=0;while(m=e[g++]){if(m(d,l,c)){f.push(d);break;}}T&&(w=N,r=++n);}o&&((d=!m&&d)&&v--,a&&b.push(d));}if(v+=x,o&&x!==v){g=0;while(m=t[g++]){m(b,y,l,c);}if(a){if(v>0){while(x--){b[x]||y[x]||(y[x]=q.call(f));}}y=xt(y);}O.apply(f,y),T&&!a&&y.length>0&&v+t.length>1&&ot.uniqueSort(f);}return T&&(w=N,u=C),b;};return o?at(a):a;}a=ot.compile=function(e,t){var n,r=[],i=[],o=N[e+" "];if(!o){t||(t=gt(e)),n=t.length;while(n--){o=wt(t[n]),o[v]?r.push(o):i.push(o);}o=N(e,Tt(i,r));}return o;};function Ct(e,t,n){var r=0,i=t.length;for(;i>r;r++){ot(e,t[r],n);}return n;}function kt(e,t,r,o){var s,u,l,c,p,f=gt(e);if(!o&&1===f.length){if(u=f[0]=f[0].slice(0),u.length>2&&"ID"===(l=u[0]).type&&n.getById&&9===t.nodeType&&h&&i.relative[u[1].type]){if(t=(i.find.ID(l.matches[0].replace(nt,rt),t)||[])[0],!t){return r;}e=e.slice(u.shift().value.length);}s=J.needsContext.test(e)?0:u.length;while(s--){if(l=u[s],i.relative[c=l.type]){break;}if((p=i.find[c])&&(o=p(l.matches[0].replace(nt,rt),U.test(u[0].type)&&t.parentNode||t))){if(u.splice(s,1),e=o.length&&mt(u),!e){return O.apply(r,o),r;}break;}}}return a(e,f)(o,t,!h,r,U.test(e)),r;}n.sortStable=v.split("").sort(S).join("")===v,n.detectDuplicates=E,c(),n.sortDetached=ut(function(e){return 1&e.compareDocumentPosition(p.createElement("div"));}),ut(function(e){return e.innerHTML="<a href='#'></a>","#"===e.firstChild.getAttribute("href");})||lt("type|href|height|width",function(e,t,n){return n?undefined:e.getAttribute(t,"type"===t.toLowerCase()?1:2);}),n.attributes&&ut(function(e){return e.innerHTML="<input/>",e.firstChild.setAttribute("value",""),""===e.firstChild.getAttribute("value");})||lt("value",function(e,t,n){return n||"input"!==e.nodeName.toLowerCase()?undefined:e.defaultValue;}),ut(function(e){return null==e.getAttribute("disabled");})||lt(R,function(e,t,n){var r;return n?undefined:(r=e.getAttributeNode(t))&&r.specified?r.value:e[t]===!0?t.toLowerCase():null;}),x.find=ot,x.expr=ot.selectors,x.expr[":"]=x.expr.pseudos,x.unique=ot.uniqueSort,x.text=ot.getText,x.isXMLDoc=ot.isXML,x.contains=ot.contains;}(e);var D={};function A(e){var t=D[e]={};return x.each(e.match(w)||[],function(e,n){t[n]=!0;}),t;}x.Callbacks=function(e){e="string"==typeof e?D[e]||A(e):x.extend({},e);var t,n,r,i,o,s,a=[],u=!e.once&&[],l=function(p){for(t=e.memory&&p,n=!0,s=i||0,i=0,o=a.length,r=!0;a&&o>s;s++){if(a[s].apply(p[0],p[1])===!1&&e.stopOnFalse){t=!1;break;}}r=!1,a&&(u?u.length&&l(u.shift()):t?a=[]:c.disable());},c={add:function(){if(a){var n=a.length;(function s(t){x.each(t,function(t,n){var r=x.type(n);"function"===r?e.unique&&c.has(n)||a.push(n):n&&n.length&&"string"!==r&&s(n);});})(arguments),r?o=a.length:t&&(i=n,l(t));}return this;},remove:function(){return a&&x.each(arguments,function(e,t){var n;while((n=x.inArray(t,a,n))>-1){a.splice(n,1),r&&(o>=n&&o--,s>=n&&s--);}}),this;},has:function(e){return e?x.inArray(e,a)>-1:!(!a||!a.length);},empty:function(){return a=[],o=0,this;},disable:function(){return a=u=t=undefined,this;},disabled:function(){return !a;},lock:function(){return u=undefined,t||c.disable(),this;},locked:function(){return !u;},fireWith:function(e,t){return !a||n&&!u||(t=t||[],t=[e,t.slice?t.slice():t],r?u.push(t):l(t)),this;},fire:function(){return c.fireWith(this,arguments),this;},fired:function(){return !!n;}};return c;},x.extend({Deferred:function(e){var t=[["resolve","done",x.Callbacks("once memory"),"resolved"],["reject","fail",x.Callbacks("once memory"),"rejected"],["notify","progress",x.Callbacks("memory")]],n="pending",r={state:function(){return n;},always:function(){return i.done(arguments).fail(arguments),this;},then:function(){var e=arguments;return x.Deferred(function(n){x.each(t,function(t,o){var s=o[0],a=x.isFunction(e[t])&&e[t];i[o[1]](function(){var e=a&&a.apply(this,arguments);e&&x.isFunction(e.promise)?e.promise().done(n.resolve).fail(n.reject).progress(n.notify):n[s+"With"](this===r?n.promise():this,a?[e]:arguments);});}),e=null;}).promise();},promise:function(e){return null!=e?x.extend(e,r):r;}},i={};return r.pipe=r.then,x.each(t,function(e,o){var s=o[2],a=o[3];r[o[1]]=s.add,a&&s.add(function(){n=a;},t[1^e][2].disable,t[2][2].lock),i[o[0]]=function(){return i[o[0]+"With"](this===i?r:this,arguments),this;},i[o[0]+"With"]=s.fireWith;}),r.promise(i),e&&e.call(i,i),i;},when:function(e){var t=0,n=d.call(arguments),r=n.length,i=1!==r||e&&x.isFunction(e.promise)?r:0,o=1===i?e:x.Deferred(),s=function(e,t,n){return function(r){t[e]=this,n[e]=arguments.length>1?d.call(arguments):r,n===a?o.notifyWith(t,n):--i||o.resolveWith(t,n);};},a,u,l;if(r>1){for(a=Array(r),u=Array(r),l=Array(r);r>t;t++){n[t]&&x.isFunction(n[t].promise)?n[t].promise().done(s(t,l,n)).fail(o.reject).progress(s(t,u,a)):--i;}}return i||o.resolveWith(l,n),o.promise();}}),x.support=function(t){var n=o.createElement("input"),r=o.createDocumentFragment(),i=o.createElement("div"),s=o.createElement("select"),a=s.appendChild(o.createElement("option"));return n.type?(n.type="checkbox",t.checkOn=""!==n.value,t.optSelected=a.selected,t.reliableMarginRight=!0,t.boxSizingReliable=!0,t.pixelPosition=!1,n.checked=!0,t.noCloneChecked=n.cloneNode(!0).checked,s.disabled=!0,t.optDisabled=!a.disabled,n=o.createElement("input"),n.value="t",n.type="radio",t.radioValue="t"===n.value,n.setAttribute("checked","t"),n.setAttribute("name","t"),r.appendChild(n),t.checkClone=r.cloneNode(!0).cloneNode(!0).lastChild.checked,t.focusinBubbles="onfocusin" in e,i.style.backgroundClip="content-box",i.cloneNode(!0).style.backgroundClip="",t.clearCloneStyle="content-box"===i.style.backgroundClip,x(function(){var n,r,s="padding:0;margin:0;border:0;display:block;-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box",a=o.getElementsByTagName("body")[0];a&&(n=o.createElement("div"),n.style.cssText="border:0;width:0;height:0;position:absolute;top:0;left:-9999px;margin-top:1px",a.appendChild(n).appendChild(i),i.innerHTML="",i.style.cssText="-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%",x.swap(a,null!=a.style.zoom?{zoom:1}:{},function(){t.boxSizing=4===i.offsetWidth;}),e.getComputedStyle&&(t.pixelPosition="1%"!==(e.getComputedStyle(i,null)||{}).top,t.boxSizingReliable="4px"===(e.getComputedStyle(i,null)||{width:"4px"}).width,r=i.appendChild(o.createElement("div")),r.style.cssText=i.style.cssText=s,r.style.marginRight=r.style.width="0",i.style.width="1px",t.reliableMarginRight=!parseFloat((e.getComputedStyle(r,null)||{}).marginRight)),a.removeChild(n));}),t):t;}({});var L,q,H=/(?:\{[\s\S]*\}|\[[\s\S]*\])$/,O=/([A-Z])/g;function F(){Object.defineProperty(this.cache={},0,{get:function(){return{};}}),this.expando=x.expando+Math.random();}F.uid=1,F.accepts=function(e){return e.nodeType?1===e.nodeType||9===e.nodeType:!0;},F.prototype={key:function(e){if(!F.accepts(e)){return 0;}var t={},n=e[this.expando];if(!n){n=F.uid++;try{t[this.expando]={value:n},Object.defineProperties(e,t);}catch(r){t[this.expando]=n,x.extend(e,t);}}return this.cache[n]||(this.cache[n]={}),n;},set:function(e,t,n){var r,i=this.key(e),o=this.cache[i];if("string"==typeof t){o[t]=n;}else{if(x.isEmptyObject(o)){x.extend(this.cache[i],t);}else{for(r in t){o[r]=t[r];}}}return o;},get:function(e,t){var n=this.cache[this.key(e)];return t===undefined?n:n[t];},access:function(e,t,n){var r;return t===undefined||t&&"string"==typeof t&&n===undefined?(r=this.get(e,t),r!==undefined?r:this.get(e,x.camelCase(t))):(this.set(e,t,n),n!==undefined?n:t);},remove:function(e,t){var n,r,i,o=this.key(e),s=this.cache[o];if(t===undefined){this.cache[o]={};}else{x.isArray(t)?r=t.concat(t.map(x.camelCase)):(i=x.camelCase(t),t in s?r=[t,i]:(r=i,r=r in s?[r]:r.match(w)||[])),n=r.length;while(n--){delete s[r[n]];}}},hasData:function(e){return !x.isEmptyObject(this.cache[e[this.expando]]||{});},discard:function(e){e[this.expando]&&delete this.cache[e[this.expando]];}},L=new F,q=new F,x.extend({acceptData:F.accepts,hasData:function(e){return L.hasData(e)||q.hasData(e);},data:function(e,t,n){return L.access(e,t,n);},removeData:function(e,t){L.remove(e,t);},_data:function(e,t,n){return q.access(e,t,n);},_removeData:function(e,t){q.remove(e,t);}}),x.fn.extend({data:function(e,t){var n,r,i=this[0],o=0,s=null;if(e===undefined){if(this.length&&(s=L.get(i),1===i.nodeType&&!q.get(i,"hasDataAttrs"))){for(n=i.attributes;n.length>o;o++){r=n[o].name,0===r.indexOf("data-")&&(r=x.camelCase(r.slice(5)),P(i,r,s[r]));}q.set(i,"hasDataAttrs",!0);}return s;}return"object"==typeof e?this.each(function(){L.set(this,e);}):x.access(this,function(t){var n,r=x.camelCase(e);if(i&&t===undefined){if(n=L.get(i,e),n!==undefined){return n;}if(n=L.get(i,r),n!==undefined){return n;}if(n=P(i,r,undefined),n!==undefined){return n;}}else{this.each(function(){var n=L.get(this,r);L.set(this,r,t),-1!==e.indexOf("-")&&n!==undefined&&L.set(this,e,t);});}},null,t,arguments.length>1,null,!0);},removeData:function(e){return this.each(function(){L.remove(this,e);});}});function P(e,t,n){var r;if(n===undefined&&1===e.nodeType){if(r="data-"+t.replace(O,"-$1").toLowerCase(),n=e.getAttribute(r),"string"==typeof n){try{n="true"===n?!0:"false"===n?!1:"null"===n?null:+n+""===n?+n:H.test(n)?JSON.parse(n):n;}catch(i){}L.set(e,t,n);}else{n=undefined;}}return n;}x.extend({queue:function(e,t,n){var r;return e?(t=(t||"fx")+"queue",r=q.get(e,t),n&&(!r||x.isArray(n)?r=q.access(e,t,x.makeArray(n)):r.push(n)),r||[]):undefined;},dequeue:function(e,t){t=t||"fx";var n=x.queue(e,t),r=n.length,i=n.shift(),o=x._queueHooks(e,t),s=function(){x.dequeue(e,t);};"inprogress"===i&&(i=n.shift(),r--),i&&("fx"===t&&n.unshift("inprogress"),delete o.stop,i.call(e,s,o)),!r&&o&&o.empty.fire();},_queueHooks:function(e,t){var n=t+"queueHooks";return q.get(e,n)||q.access(e,n,{empty:x.Callbacks("once memory").add(function(){q.remove(e,[t+"queue",n]);})});}}),x.fn.extend({queue:function(e,t){var n=2;return"string"!=typeof e&&(t=e,e="fx",n--),n>arguments.length?x.queue(this[0],e):t===undefined?this:this.each(function(){var n=x.queue(this,e,t);x._queueHooks(this,e),"fx"===e&&"inprogress"!==n[0]&&x.dequeue(this,e);});},dequeue:function(e){return this.each(function(){x.dequeue(this,e);});},delay:function(e,t){return e=x.fx?x.fx.speeds[e]||e:e,t=t||"fx",this.queue(t,function(t,n){var r=setTimeout(t,e);n.stop=function(){clearTimeout(r);};});},clearQueue:function(e){return this.queue(e||"fx",[]);},promise:function(e,t){var n,r=1,i=x.Deferred(),o=this,s=this.length,a=function(){--r||i.resolveWith(o,[o]);};"string"!=typeof e&&(t=e,e=undefined),e=e||"fx";while(s--){n=q.get(o[s],e+"queueHooks"),n&&n.empty&&(r++,n.empty.add(a));}return a(),i.promise(t);}});var R,M,W=/[\t\r\n\f]/g,$=/\r/g,B=/^(?:input|select|textarea|button)$/i;x.fn.extend({attr:function(e,t){return x.access(this,x.attr,e,t,arguments.length>1);},removeAttr:function(e){return this.each(function(){x.removeAttr(this,e);});},prop:function(e,t){return x.access(this,x.prop,e,t,arguments.length>1);},removeProp:function(e){return this.each(function(){delete this[x.propFix[e]||e];});},addClass:function(e){var t,n,r,i,o,s=0,a=this.length,u="string"==typeof e&&e;if(x.isFunction(e)){return this.each(function(t){x(this).addClass(e.call(this,t,this.className));});}if(u){for(t=(e||"").match(w)||[];a>s;s++){if(n=this[s],r=1===n.nodeType&&(n.className?(" "+n.className+" ").replace(W," "):" ")){o=0;while(i=t[o++]){0>r.indexOf(" "+i+" ")&&(r+=i+" ");}n.className=x.trim(r);}}}return this;},removeClass:function(e){var t,n,r,i,o,s=0,a=this.length,u=0===arguments.length||"string"==typeof e&&e;if(x.isFunction(e)){return this.each(function(t){x(this).removeClass(e.call(this,t,this.className));});}if(u){for(t=(e||"").match(w)||[];a>s;s++){if(n=this[s],r=1===n.nodeType&&(n.className?(" "+n.className+" ").replace(W," "):"")){o=0;while(i=t[o++]){while(r.indexOf(" "+i+" ")>=0){r=r.replace(" "+i+" "," ");}}n.className=e?x.trim(r):"";}}}return this;},toggleClass:function(e,t){var n=typeof e;return"boolean"==typeof t&&"string"===n?t?this.addClass(e):this.removeClass(e):x.isFunction(e)?this.each(function(n){x(this).toggleClass(e.call(this,n,this.className,t),t);}):this.each(function(){if("string"===n){var t,i=0,o=x(this),s=e.match(w)||[];while(t=s[i++]){o.hasClass(t)?o.removeClass(t):o.addClass(t);}}else{(n===r||"boolean"===n)&&(this.className&&q.set(this,"__className__",this.className),this.className=this.className||e===!1?"":q.get(this,"__className__")||"");}});},hasClass:function(e){var t=" "+e+" ",n=0,r=this.length;for(;r>n;n++){if(1===this[n].nodeType&&(" "+this[n].className+" ").replace(W," ").indexOf(t)>=0){return !0;}}return !1;},val:function(e){var t,n,r,i=this[0];if(arguments.length){return r=x.isFunction(e),this.each(function(n){var i;1===this.nodeType&&(i=r?e.call(this,n,x(this).val()):e,null==i?i="":"number"==typeof i?i+="":x.isArray(i)&&(i=x.map(i,function(e){return null==e?"":e+"";})),t=x.valHooks[this.type]||x.valHooks[this.nodeName.toLowerCase()],t&&"set" in t&&t.set(this,i,"value")!==undefined||(this.value=i));});}if(i){return t=x.valHooks[i.type]||x.valHooks[i.nodeName.toLowerCase()],t&&"get" in t&&(n=t.get(i,"value"))!==undefined?n:(n=i.value,"string"==typeof n?n.replace($,""):null==n?"":n);}}}),x.extend({valHooks:{option:{get:function(e){var t=e.attributes.value;return !t||t.specified?e.value:e.text;}},select:{get:function(e){var t,n,r=e.options,i=e.selectedIndex,o="select-one"===e.type||0>i,s=o?null:[],a=o?i+1:r.length,u=0>i?a:o?i:0;for(;a>u;u++){if(n=r[u],!(!n.selected&&u!==i||(x.support.optDisabled?n.disabled:null!==n.getAttribute("disabled"))||n.parentNode.disabled&&x.nodeName(n.parentNode,"optgroup"))){if(t=x(n).val(),o){return t;}s.push(t);}}return s;},set:function(e,t){var n,r,i=e.options,o=x.makeArray(t),s=i.length;while(s--){r=i[s],(r.selected=x.inArray(x(r).val(),o)>=0)&&(n=!0);}return n||(e.selectedIndex=-1),o;}}},attr:function(e,t,n){var i,o,s=e.nodeType;if(e&&3!==s&&8!==s&&2!==s){return typeof e.getAttribute===r?x.prop(e,t,n):(1===s&&x.isXMLDoc(e)||(t=t.toLowerCase(),i=x.attrHooks[t]||(x.expr.match.bool.test(t)?M:R)),n===undefined?i&&"get" in i&&null!==(o=i.get(e,t))?o:(o=x.find.attr(e,t),null==o?undefined:o):null!==n?i&&"set" in i&&(o=i.set(e,n,t))!==undefined?o:(e.setAttribute(t,n+""),n):(x.removeAttr(e,t),undefined));}},removeAttr:function(e,t){var n,r,i=0,o=t&&t.match(w);if(o&&1===e.nodeType){while(n=o[i++]){r=x.propFix[n]||n,x.expr.match.bool.test(n)&&(e[r]=!1),e.removeAttribute(n);}}},attrHooks:{type:{set:function(e,t){if(!x.support.radioValue&&"radio"===t&&x.nodeName(e,"input")){var n=e.value;return e.setAttribute("type",t),n&&(e.value=n),t;}}}},propFix:{"for":"htmlFor","class":"className"},prop:function(e,t,n){var r,i,o,s=e.nodeType;if(e&&3!==s&&8!==s&&2!==s){return o=1!==s||!x.isXMLDoc(e),o&&(t=x.propFix[t]||t,i=x.propHooks[t]),n!==undefined?i&&"set" in i&&(r=i.set(e,n,t))!==undefined?r:e[t]=n:i&&"get" in i&&null!==(r=i.get(e,t))?r:e[t];}},propHooks:{tabIndex:{get:function(e){return e.hasAttribute("tabindex")||B.test(e.nodeName)||e.href?e.tabIndex:-1;}}}}),M={set:function(e,t,n){return t===!1?x.removeAttr(e,n):e.setAttribute(n,n),n;}},x.each(x.expr.match.bool.source.match(/\w+/g),function(e,t){var n=x.expr.attrHandle[t]||x.find.attr;x.expr.attrHandle[t]=function(e,t,r){var i=x.expr.attrHandle[t],o=r?undefined:(x.expr.attrHandle[t]=undefined)!=n(e,t,r)?t.toLowerCase():null;return x.expr.attrHandle[t]=i,o;};}),x.support.optSelected||(x.propHooks.selected={get:function(e){var t=e.parentNode;return t&&t.parentNode&&t.parentNode.selectedIndex,null;}}),x.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){x.propFix[this.toLowerCase()]=this;}),x.each(["radio","checkbox"],function(){x.valHooks[this]={set:function(e,t){return x.isArray(t)?e.checked=x.inArray(x(e).val(),t)>=0:undefined;}},x.support.checkOn||(x.valHooks[this].get=function(e){return null===e.getAttribute("value")?"on":e.value;});});var I=/^key/,z=/^(?:mouse|contextmenu)|click/,_=/^(?:focusinfocus|focusoutblur)$/,X=/^([^.]*)(?:\.(.+)|)$/;function U(){return !0;}function Y(){return !1;}function V(){try{return o.activeElement;}catch(e){}}x.event={global:{},add:function(e,t,n,i,o){var s,a,u,l,c,p,f,h,d,g,m,y=q.get(e);if(y){n.handler&&(s=n,n=s.handler,o=s.selector),n.guid||(n.guid=x.guid++),(l=y.events)||(l=y.events={}),(a=y.handle)||(a=y.handle=function(e){return typeof x===r||e&&x.event.triggered===e.type?undefined:x.event.dispatch.apply(a.elem,arguments);},a.elem=e),t=(t||"").match(w)||[""],c=t.length;while(c--){u=X.exec(t[c])||[],d=m=u[1],g=(u[2]||"").split(".").sort(),d&&(f=x.event.special[d]||{},d=(o?f.delegateType:f.bindType)||d,f=x.event.special[d]||{},p=x.extend({type:d,origType:m,data:i,handler:n,guid:n.guid,selector:o,needsContext:o&&x.expr.match.needsContext.test(o),namespace:g.join(".")},s),(h=l[d])||(h=l[d]=[],h.delegateCount=0,f.setup&&f.setup.call(e,i,g,a)!==!1||e.addEventListener&&e.addEventListener(d,a,!1)),f.add&&(f.add.call(e,p),p.handler.guid||(p.handler.guid=n.guid)),o?h.splice(h.delegateCount++,0,p):h.push(p),x.event.global[d]=!0);}e=null;}},remove:function(e,t,n,r,i){var o,s,a,u,l,c,p,f,h,d,g,m=q.hasData(e)&&q.get(e);if(m&&(u=m.events)){t=(t||"").match(w)||[""],l=t.length;while(l--){if(a=X.exec(t[l])||[],h=g=a[1],d=(a[2]||"").split(".").sort(),h){p=x.event.special[h]||{},h=(r?p.delegateType:p.bindType)||h,f=u[h]||[],a=a[2]&&RegExp("(^|\\.)"+d.join("\\.(?:.*\\.|)")+"(\\.|$)"),s=o=f.length;while(o--){c=f[o],!i&&g!==c.origType||n&&n.guid!==c.guid||a&&!a.test(c.namespace)||r&&r!==c.selector&&("**"!==r||!c.selector)||(f.splice(o,1),c.selector&&f.delegateCount--,p.remove&&p.remove.call(e,c));}s&&!f.length&&(p.teardown&&p.teardown.call(e,d,m.handle)!==!1||x.removeEvent(e,h,m.handle),delete u[h]);}else{for(h in u){x.event.remove(e,h+t[l],n,r,!0);}}}x.isEmptyObject(u)&&(delete m.handle,q.remove(e,"events"));}},trigger:function(t,n,r,i){var s,a,u,l,c,p,f,h=[r||o],d=y.call(t,"type")?t.type:t,g=y.call(t,"namespace")?t.namespace.split("."):[];if(a=u=r=r||o,3!==r.nodeType&&8!==r.nodeType&&!_.test(d+x.event.triggered)&&(d.indexOf(".")>=0&&(g=d.split("."),d=g.shift(),g.sort()),c=0>d.indexOf(":")&&"on"+d,t=t[x.expando]?t:new x.Event(d,"object"==typeof t&&t),t.isTrigger=i?2:3,t.namespace=g.join("."),t.namespace_re=t.namespace?RegExp("(^|\\.)"+g.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,t.result=undefined,t.target||(t.target=r),n=null==n?[t]:x.makeArray(n,[t]),f=x.event.special[d]||{},i||!f.trigger||f.trigger.apply(r,n)!==!1)){if(!i&&!f.noBubble&&!x.isWindow(r)){for(l=f.delegateType||d,_.test(l+d)||(a=a.parentNode);a;a=a.parentNode){h.push(a),u=a;}u===(r.ownerDocument||o)&&h.push(u.defaultView||u.parentWindow||e);}s=0;while((a=h[s++])&&!t.isPropagationStopped()){t.type=s>1?l:f.bindType||d,p=(q.get(a,"events")||{})[t.type]&&q.get(a,"handle"),p&&p.apply(a,n),p=c&&a[c],p&&x.acceptData(a)&&p.apply&&p.apply(a,n)===!1&&t.preventDefault();}return t.type=d,i||t.isDefaultPrevented()||f._default&&f._default.apply(h.pop(),n)!==!1||!x.acceptData(r)||c&&x.isFunction(r[d])&&!x.isWindow(r)&&(u=r[c],u&&(r[c]=null),x.event.triggered=d,r[d](),x.event.triggered=undefined,u&&(r[c]=u)),t.result;}},dispatch:function(e){e=x.event.fix(e);var t,n,r,i,o,s=[],a=d.call(arguments),u=(q.get(this,"events")||{})[e.type]||[],l=x.event.special[e.type]||{};if(a[0]=e,e.delegateTarget=this,!l.preDispatch||l.preDispatch.call(this,e)!==!1){s=x.event.handlers.call(this,e,u),t=0;while((i=s[t++])&&!e.isPropagationStopped()){e.currentTarget=i.elem,n=0;while((o=i.handlers[n++])&&!e.isImmediatePropagationStopped()){(!e.namespace_re||e.namespace_re.test(o.namespace))&&(e.handleObj=o,e.data=o.data,r=((x.event.special[o.origType]||{}).handle||o.handler).apply(i.elem,a),r!==undefined&&(e.result=r)===!1&&(e.preventDefault(),e.stopPropagation()));}}return l.postDispatch&&l.postDispatch.call(this,e),e.result;}},handlers:function(e,t){var n,r,i,o,s=[],a=t.delegateCount,u=e.target;if(a&&u.nodeType&&(!e.button||"click"!==e.type)){for(;u!==this;u=u.parentNode||this){if(u.disabled!==!0||"click"!==e.type){for(r=[],n=0;a>n;n++){o=t[n],i=o.selector+" ",r[i]===undefined&&(r[i]=o.needsContext?x(i,this).index(u)>=0:x.find(i,this,null,[u]).length),r[i]&&r.push(o);}r.length&&s.push({elem:u,handlers:r});}}}return t.length>a&&s.push({elem:this,handlers:t.slice(a)}),s;},props:"altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(e,t){return null==e.which&&(e.which=null!=t.charCode?t.charCode:t.keyCode),e;}},mouseHooks:{props:"button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(e,t){var n,r,i,s=t.button;return null==e.pageX&&null!=t.clientX&&(n=e.target.ownerDocument||o,r=n.documentElement,i=n.body,e.pageX=t.clientX+(r&&r.scrollLeft||i&&i.scrollLeft||0)-(r&&r.clientLeft||i&&i.clientLeft||0),e.pageY=t.clientY+(r&&r.scrollTop||i&&i.scrollTop||0)-(r&&r.clientTop||i&&i.clientTop||0)),e.which||s===undefined||(e.which=1&s?1:2&s?3:4&s?2:0),e;}},fix:function(e){if(e[x.expando]){return e;}var t,n,r,i=e.type,s=e,a=this.fixHooks[i];a||(this.fixHooks[i]=a=z.test(i)?this.mouseHooks:I.test(i)?this.keyHooks:{}),r=a.props?this.props.concat(a.props):this.props,e=new x.Event(s),t=r.length;while(t--){n=r[t],e[n]=s[n];}return e.target||(e.target=o),3===e.target.nodeType&&(e.target=e.target.parentNode),a.filter?a.filter(e,s):e;},special:{load:{noBubble:!0},focus:{trigger:function(){return this!==V()&&this.focus?(this.focus(),!1):undefined;},delegateType:"focusin"},blur:{trigger:function(){return this===V()&&this.blur?(this.blur(),!1):undefined;},delegateType:"focusout"},click:{trigger:function(){return"checkbox"===this.type&&this.click&&x.nodeName(this,"input")?(this.click(),!1):undefined;},_default:function(e){return x.nodeName(e.target,"a");}},beforeunload:{postDispatch:function(e){e.result!==undefined&&(e.originalEvent.returnValue=e.result);}}},simulate:function(e,t,n,r){var i=x.extend(new x.Event,n,{type:e,isSimulated:!0,originalEvent:{}});r?x.event.trigger(i,null,t):x.event.dispatch.call(t,i),i.isDefaultPrevented()&&n.preventDefault();}},x.removeEvent=function(e,t,n){e.removeEventListener&&e.removeEventListener(t,n,!1);},x.Event=function(e,t){return this instanceof x.Event?(e&&e.type?(this.originalEvent=e,this.type=e.type,this.isDefaultPrevented=e.defaultPrevented||e.getPreventDefault&&e.getPreventDefault()?U:Y):this.type=e,t&&x.extend(this,t),this.timeStamp=e&&e.timeStamp||x.now(),this[x.expando]=!0,undefined):new x.Event(e,t);},x.Event.prototype={isDefaultPrevented:Y,isPropagationStopped:Y,isImmediatePropagationStopped:Y,preventDefault:function(){var e=this.originalEvent;this.isDefaultPrevented=U,e&&e.preventDefault&&e.preventDefault();},stopPropagation:function(){var e=this.originalEvent;this.isPropagationStopped=U,e&&e.stopPropagation&&e.stopPropagation();},stopImmediatePropagation:function(){this.isImmediatePropagationStopped=U,this.stopPropagation();}},x.each({mouseenter:"mouseover",mouseleave:"mouseout"},function(e,t){x.event.special[e]={delegateType:t,bindType:t,handle:function(e){var n,r=this,i=e.relatedTarget,o=e.handleObj;return(!i||i!==r&&!x.contains(r,i))&&(e.type=o.origType,n=o.handler.apply(this,arguments),e.type=t),n;}};}),x.support.focusinBubbles||x.each({focus:"focusin",blur:"focusout"},function(e,t){var n=0,r=function(e){x.event.simulate(t,e.target,x.event.fix(e),!0);};x.event.special[t]={setup:function(){0===n++&&o.addEventListener(e,r,!0);},teardown:function(){0===--n&&o.removeEventListener(e,r,!0);}};}),x.fn.extend({on:function(e,t,n,r,i){var o,s;if("object"==typeof e){"string"!=typeof t&&(n=n||t,t=undefined);for(s in e){this.on(s,t,n,e[s],i);}return this;}if(null==n&&null==r?(r=t,n=t=undefined):null==r&&("string"==typeof t?(r=n,n=undefined):(r=n,n=t,t=undefined)),r===!1){r=Y;}else{if(!r){return this;}}return 1===i&&(o=r,r=function(e){return x().off(e),o.apply(this,arguments);},r.guid=o.guid||(o.guid=x.guid++)),this.each(function(){x.event.add(this,e,r,n,t);});},one:function(e,t,n,r){return this.on(e,t,n,r,1);},off:function(e,t,n){var r,i;if(e&&e.preventDefault&&e.handleObj){return r=e.handleObj,x(e.delegateTarget).off(r.namespace?r.origType+"."+r.namespace:r.origType,r.selector,r.handler),this;}if("object"==typeof e){for(i in e){this.off(i,t,e[i]);}return this;}return(t===!1||"function"==typeof t)&&(n=t,t=undefined),n===!1&&(n=Y),this.each(function(){x.event.remove(this,e,n,t);});},trigger:function(e,t){return this.each(function(){x.event.trigger(e,t,this);});},triggerHandler:function(e,t){var n=this[0];return n?x.event.trigger(e,t,n,!0):undefined;}});var G=/^.[^:#\[\.,]*$/,J=/^(?:parents|prev(?:Until|All))/,Q=x.expr.match.needsContext,K={children:!0,contents:!0,next:!0,prev:!0};x.fn.extend({find:function(e){var t,n=[],r=this,i=r.length;if("string"!=typeof e){return this.pushStack(x(e).filter(function(){for(t=0;i>t;t++){if(x.contains(r[t],this)){return !0;}}}));}for(t=0;i>t;t++){x.find(e,r[t],n);}return n=this.pushStack(i>1?x.unique(n):n),n.selector=this.selector?this.selector+" "+e:e,n;},has:function(e){var t=x(e,this),n=t.length;return this.filter(function(){var e=0;for(;n>e;e++){if(x.contains(this,t[e])){return !0;}}});},not:function(e){return this.pushStack(et(this,e||[],!0));},filter:function(e){return this.pushStack(et(this,e||[],!1));},is:function(e){return !!et(this,"string"==typeof e&&Q.test(e)?x(e):e||[],!1).length;},closest:function(e,t){var n,r=0,i=this.length,o=[],s=Q.test(e)||"string"!=typeof e?x(e,t||this.context):0;for(;i>r;r++){for(n=this[r];n&&n!==t;n=n.parentNode){if(11>n.nodeType&&(s?s.index(n)>-1:1===n.nodeType&&x.find.matchesSelector(n,e))){n=o.push(n);break;}}}return this.pushStack(o.length>1?x.unique(o):o);},index:function(e){return e?"string"==typeof e?g.call(x(e),this[0]):g.call(this,e.jquery?e[0]:e):this[0]&&this[0].parentNode?this.first().prevAll().length:-1;},add:function(e,t){var n="string"==typeof e?x(e,t):x.makeArray(e&&e.nodeType?[e]:e),r=x.merge(this.get(),n);return this.pushStack(x.unique(r));},addBack:function(e){return this.add(null==e?this.prevObject:this.prevObject.filter(e));}});function Z(e,t){while((e=e[t])&&1!==e.nodeType){}return e;}x.each({parent:function(e){var t=e.parentNode;return t&&11!==t.nodeType?t:null;},parents:function(e){return x.dir(e,"parentNode");},parentsUntil:function(e,t,n){return x.dir(e,"parentNode",n);},next:function(e){return Z(e,"nextSibling");},prev:function(e){return Z(e,"previousSibling");},nextAll:function(e){return x.dir(e,"nextSibling");},prevAll:function(e){return x.dir(e,"previousSibling");},nextUntil:function(e,t,n){return x.dir(e,"nextSibling",n);},prevUntil:function(e,t,n){return x.dir(e,"previousSibling",n);},siblings:function(e){return x.sibling((e.parentNode||{}).firstChild,e);},children:function(e){return x.sibling(e.firstChild);},contents:function(e){return e.contentDocument||x.merge([],e.childNodes);}},function(e,t){x.fn[e]=function(n,r){var i=x.map(this,t,n);return"Until"!==e.slice(-5)&&(r=n),r&&"string"==typeof r&&(i=x.filter(r,i)),this.length>1&&(K[e]||x.unique(i),J.test(e)&&i.reverse()),this.pushStack(i);};}),x.extend({filter:function(e,t,n){var r=t[0];return n&&(e=":not("+e+")"),1===t.length&&1===r.nodeType?x.find.matchesSelector(r,e)?[r]:[]:x.find.matches(e,x.grep(t,function(e){return 1===e.nodeType;}));},dir:function(e,t,n){var r=[],i=n!==undefined;while((e=e[t])&&9!==e.nodeType){if(1===e.nodeType){if(i&&x(e).is(n)){break;}r.push(e);}}return r;},sibling:function(e,t){var n=[];for(;e;e=e.nextSibling){1===e.nodeType&&e!==t&&n.push(e);}return n;}});function et(e,t,n){if(x.isFunction(t)){return x.grep(e,function(e,r){return !!t.call(e,r,e)!==n;});}if(t.nodeType){return x.grep(e,function(e){return e===t!==n;});}if("string"==typeof t){if(G.test(t)){return x.filter(t,e,n);}t=x.filter(t,e);}return x.grep(e,function(e){return g.call(t,e)>=0!==n;});}var tt=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,nt=/<([\w:]+)/,rt=/<|&#?\w+;/,it=/<(?:script|style|link)/i,ot=/^(?:checkbox|radio)$/i,st=/checked\s*(?:[^=]|=\s*.checked.)/i,at=/^$|\/(?:java|ecma)script/i,ut=/^true\/(.*)/,lt=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,ct={option:[1,"<select multiple='multiple'>","</select>"],thead:[1,"<table>","</table>"],col:[2,"<table><colgroup>","</colgroup></table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]};ct.optgroup=ct.option,ct.tbody=ct.tfoot=ct.colgroup=ct.caption=ct.thead,ct.th=ct.td,x.fn.extend({text:function(e){return x.access(this,function(e){return e===undefined?x.text(this):this.empty().append((this[0]&&this[0].ownerDocument||o).createTextNode(e));},null,e,arguments.length);},append:function(){return this.domManip(arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var t=pt(this,e);t.appendChild(e);}});},prepend:function(){return this.domManip(arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var t=pt(this,e);t.insertBefore(e,t.firstChild);}});},before:function(){return this.domManip(arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this);});},after:function(){return this.domManip(arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this.nextSibling);});},remove:function(e,t){var n,r=e?x.filter(e,this):this,i=0;for(;null!=(n=r[i]);i++){t||1!==n.nodeType||x.cleanData(mt(n)),n.parentNode&&(t&&x.contains(n.ownerDocument,n)&&dt(mt(n,"script")),n.parentNode.removeChild(n));}return this;},empty:function(){var e,t=0;for(;null!=(e=this[t]);t++){1===e.nodeType&&(x.cleanData(mt(e,!1)),e.textContent="");}return this;},clone:function(e,t){return e=null==e?!1:e,t=null==t?e:t,this.map(function(){return x.clone(this,e,t);});},html:function(e){return x.access(this,function(e){var t=this[0]||{},n=0,r=this.length;if(e===undefined&&1===t.nodeType){return t.innerHTML;}if("string"==typeof e&&!it.test(e)&&!ct[(nt.exec(e)||["",""])[1].toLowerCase()]){e=e.replace(tt,"<$1></$2>");try{for(;r>n;n++){t=this[n]||{},1===t.nodeType&&(x.cleanData(mt(t,!1)),t.innerHTML=e);}t=0;}catch(i){}}t&&this.empty().append(e);},null,e,arguments.length);},replaceWith:function(){var e=x.map(this,function(e){return[e.nextSibling,e.parentNode];}),t=0;return this.domManip(arguments,function(n){var r=e[t++],i=e[t++];i&&(r&&r.parentNode!==i&&(r=this.nextSibling),x(this).remove(),i.insertBefore(n,r));},!0),t?this:this.remove();},detach:function(e){return this.remove(e,!0);},domManip:function(e,t,n){e=f.apply([],e);var r,i,o,s,a,u,l=0,c=this.length,p=this,h=c-1,d=e[0],g=x.isFunction(d);if(g||!(1>=c||"string"!=typeof d||x.support.checkClone)&&st.test(d)){return this.each(function(r){var i=p.eq(r);g&&(e[0]=d.call(this,r,i.html())),i.domManip(e,t,n);});}if(c&&(r=x.buildFragment(e,this[0].ownerDocument,!1,!n&&this),i=r.firstChild,1===r.childNodes.length&&(r=i),i)){for(o=x.map(mt(r,"script"),ft),s=o.length;c>l;l++){a=r,l!==h&&(a=x.clone(a,!0,!0),s&&x.merge(o,mt(a,"script"))),t.call(this[l],a,l);}if(s){for(u=o[o.length-1].ownerDocument,x.map(o,ht),l=0;s>l;l++){a=o[l],at.test(a.type||"")&&!q.access(a,"globalEval")&&x.contains(u,a)&&(a.src?x._evalUrl(a.src):x.globalEval(a.textContent.replace(lt,"")));}}}return this;}}),x.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(e,t){x.fn[e]=function(e){var n,r=[],i=x(e),o=i.length-1,s=0;for(;o>=s;s++){n=s===o?this:this.clone(!0),x(i[s])[t](n),h.apply(r,n.get());}return this.pushStack(r);};}),x.extend({clone:function(e,t,n){var r,i,o,s,a=e.cloneNode(!0),u=x.contains(e.ownerDocument,e);if(!(x.support.noCloneChecked||1!==e.nodeType&&11!==e.nodeType||x.isXMLDoc(e))){for(s=mt(a),o=mt(e),r=0,i=o.length;i>r;r++){yt(o[r],s[r]);}}if(t){if(n){for(o=o||mt(e),s=s||mt(a),r=0,i=o.length;i>r;r++){gt(o[r],s[r]);}}else{gt(e,a);}}return s=mt(a,"script"),s.length>0&&dt(s,!u&&mt(e,"script")),a;},buildFragment:function(e,t,n,r){var i,o,s,a,u,l,c=0,p=e.length,f=t.createDocumentFragment(),h=[];for(;p>c;c++){if(i=e[c],i||0===i){if("object"===x.type(i)){x.merge(h,i.nodeType?[i]:i);}else{if(rt.test(i)){o=o||f.appendChild(t.createElement("div")),s=(nt.exec(i)||["",""])[1].toLowerCase(),a=ct[s]||ct._default,o.innerHTML=a[1]+i.replace(tt,"<$1></$2>")+a[2],l=a[0];while(l--){o=o.lastChild;}x.merge(h,o.childNodes),o=f.firstChild,o.textContent="";}else{h.push(t.createTextNode(i));}}}}f.textContent="",c=0;while(i=h[c++]){if((!r||-1===x.inArray(i,r))&&(u=x.contains(i.ownerDocument,i),o=mt(f.appendChild(i),"script"),u&&dt(o),n)){l=0;while(i=o[l++]){at.test(i.type||"")&&n.push(i);}}}return f;},cleanData:function(e){var t,n,r,i,o,s,a=x.event.special,u=0;for(;(n=e[u])!==undefined;u++){if(F.accepts(n)&&(o=n[q.expando],o&&(t=q.cache[o]))){if(r=Object.keys(t.events||{}),r.length){for(s=0;(i=r[s])!==undefined;s++){a[i]?x.event.remove(n,i):x.removeEvent(n,i,t.handle);}}q.cache[o]&&delete q.cache[o];}delete L.cache[n[L.expando]];}},_evalUrl:function(e){return x.ajax({url:e,type:"GET",dataType:"script",async:!1,global:!1,"throws":!0});}});function pt(e,t){return x.nodeName(e,"table")&&x.nodeName(1===t.nodeType?t:t.firstChild,"tr")?e.getElementsByTagName("tbody")[0]||e.appendChild(e.ownerDocument.createElement("tbody")):e;}function ft(e){return e.type=(null!==e.getAttribute("type"))+"/"+e.type,e;}function ht(e){var t=ut.exec(e.type);return t?e.type=t[1]:e.removeAttribute("type"),e;}function dt(e,t){var n=e.length,r=0;for(;n>r;r++){q.set(e[r],"globalEval",!t||q.get(t[r],"globalEval"));}}function gt(e,t){var n,r,i,o,s,a,u,l;if(1===t.nodeType){if(q.hasData(e)&&(o=q.access(e),s=q.set(t,o),l=o.events)){delete s.handle,s.events={};for(i in l){for(n=0,r=l[i].length;r>n;n++){x.event.add(t,i,l[i][n]);}}}L.hasData(e)&&(a=L.access(e),u=x.extend({},a),L.set(t,u));}}function mt(e,t){var n=e.getElementsByTagName?e.getElementsByTagName(t||"*"):e.querySelectorAll?e.querySelectorAll(t||"*"):[];return t===undefined||t&&x.nodeName(e,t)?x.merge([e],n):n;}function yt(e,t){var n=t.nodeName.toLowerCase();"input"===n&&ot.test(e.type)?t.checked=e.checked:("input"===n||"textarea"===n)&&(t.defaultValue=e.defaultValue);}x.fn.extend({wrapAll:function(e){var t;return x.isFunction(e)?this.each(function(t){x(this).wrapAll(e.call(this,t));}):(this[0]&&(t=x(e,this[0].ownerDocument).eq(0).clone(!0),this[0].parentNode&&t.insertBefore(this[0]),t.map(function(){var e=this;while(e.firstElementChild){e=e.firstElementChild;}return e;}).append(this)),this);},wrapInner:function(e){return x.isFunction(e)?this.each(function(t){x(this).wrapInner(e.call(this,t));}):this.each(function(){var t=x(this),n=t.contents();n.length?n.wrapAll(e):t.append(e);});},wrap:function(e){var t=x.isFunction(e);return this.each(function(n){x(this).wrapAll(t?e.call(this,n):e);});},unwrap:function(){return this.parent().each(function(){x.nodeName(this,"body")||x(this).replaceWith(this.childNodes);}).end();}});var vt,xt,bt=/^(none|table(?!-c[ea]).+)/,wt=/^margin/,Tt=RegExp("^("+b+")(.*)$","i"),Ct=RegExp("^("+b+")(?!px)[a-z%]+$","i"),kt=RegExp("^([+-])=("+b+")","i"),Nt={BODY:"block"},Et={position:"absolute",visibility:"hidden",display:"block"},St={letterSpacing:0,fontWeight:400},jt=["Top","Right","Bottom","Left"],Dt=["Webkit","O","Moz","ms"];function At(e,t){if(t in e){return t;}var n=t.charAt(0).toUpperCase()+t.slice(1),r=t,i=Dt.length;while(i--){if(t=Dt[i]+n,t in e){return t;}}return r;}function Lt(e,t){return e=t||e,"none"===x.css(e,"display")||!x.contains(e.ownerDocument,e);}function qt(t){return e.getComputedStyle(t,null);}function Ht(e,t){var n,r,i,o=[],s=0,a=e.length;for(;a>s;s++){r=e[s],r.style&&(o[s]=q.get(r,"olddisplay"),n=r.style.display,t?(o[s]||"none"!==n||(r.style.display=""),""===r.style.display&&Lt(r)&&(o[s]=q.access(r,"olddisplay",Rt(r.nodeName)))):o[s]||(i=Lt(r),(n&&"none"!==n||!i)&&q.set(r,"olddisplay",i?n:x.css(r,"display"))));}for(s=0;a>s;s++){r=e[s],r.style&&(t&&"none"!==r.style.display&&""!==r.style.display||(r.style.display=t?o[s]||"":"none"));}return e;}x.fn.extend({css:function(e,t){return x.access(this,function(e,t,n){var r,i,o={},s=0;if(x.isArray(t)){for(r=qt(e),i=t.length;i>s;s++){o[t[s]]=x.css(e,t[s],!1,r);}return o;}return n!==undefined?x.style(e,t,n):x.css(e,t);},e,t,arguments.length>1);},show:function(){return Ht(this,!0);},hide:function(){return Ht(this);},toggle:function(e){return"boolean"==typeof e?e?this.show():this.hide():this.each(function(){Lt(this)?x(this).show():x(this).hide();});}}),x.extend({cssHooks:{opacity:{get:function(e,t){if(t){var n=vt(e,"opacity");return""===n?"1":n;}}}},cssNumber:{columnCount:!0,fillOpacity:!0,fontWeight:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":"cssFloat"},style:function(e,t,n,r){if(e&&3!==e.nodeType&&8!==e.nodeType&&e.style){var i,o,s,a=x.camelCase(t),u=e.style;return t=x.cssProps[a]||(x.cssProps[a]=At(u,a)),s=x.cssHooks[t]||x.cssHooks[a],n===undefined?s&&"get" in s&&(i=s.get(e,!1,r))!==undefined?i:u[t]:(o=typeof n,"string"===o&&(i=kt.exec(n))&&(n=(i[1]+1)*i[2]+parseFloat(x.css(e,t)),o="number"),null==n||"number"===o&&isNaN(n)||("number"!==o||x.cssNumber[a]||(n+="px"),x.support.clearCloneStyle||""!==n||0!==t.indexOf("background")||(u[t]="inherit"),s&&"set" in s&&(n=s.set(e,n,r))===undefined||(u[t]=n)),undefined);}},css:function(e,t,n,r){var i,o,s,a=x.camelCase(t);return t=x.cssProps[a]||(x.cssProps[a]=At(e.style,a)),s=x.cssHooks[t]||x.cssHooks[a],s&&"get" in s&&(i=s.get(e,!0,n)),i===undefined&&(i=vt(e,t,r)),"normal"===i&&t in St&&(i=St[t]),""===n||n?(o=parseFloat(i),n===!0||x.isNumeric(o)?o||0:i):i;}}),vt=function(e,t,n){var r,i,o,s=n||qt(e),a=s?s.getPropertyValue(t)||s[t]:undefined,u=e.style;return s&&(""!==a||x.contains(e.ownerDocument,e)||(a=x.style(e,t)),Ct.test(a)&&wt.test(t)&&(r=u.width,i=u.minWidth,o=u.maxWidth,u.minWidth=u.maxWidth=u.width=a,a=s.width,u.width=r,u.minWidth=i,u.maxWidth=o)),a;};function Ot(e,t,n){var r=Tt.exec(t);return r?Math.max(0,r[1]-(n||0))+(r[2]||"px"):t;}function Ft(e,t,n,r,i){var o=n===(r?"border":"content")?4:"width"===t?1:0,s=0;for(;4>o;o+=2){"margin"===n&&(s+=x.css(e,n+jt[o],!0,i)),r?("content"===n&&(s-=x.css(e,"padding"+jt[o],!0,i)),"margin"!==n&&(s-=x.css(e,"border"+jt[o]+"Width",!0,i))):(s+=x.css(e,"padding"+jt[o],!0,i),"padding"!==n&&(s+=x.css(e,"border"+jt[o]+"Width",!0,i)));}return s;}function Pt(e,t,n){var r=!0,i="width"===t?e.offsetWidth:e.offsetHeight,o=qt(e),s=x.support.boxSizing&&"border-box"===x.css(e,"boxSizing",!1,o);if(0>=i||null==i){if(i=vt(e,t,o),(0>i||null==i)&&(i=e.style[t]),Ct.test(i)){return i;}r=s&&(x.support.boxSizingReliable||i===e.style[t]),i=parseFloat(i)||0;}return i+Ft(e,t,n||(s?"border":"content"),r,o)+"px";}function Rt(e){var t=o,n=Nt[e];return n||(n=Mt(e,t),"none"!==n&&n||(xt=(xt||x("<iframe frameborder='0' width='0' height='0'/>").css("cssText","display:block !important")).appendTo(t.documentElement),t=(xt[0].contentWindow||xt[0].contentDocument).document,t.write("<!doctype html><html><body>"),t.close(),n=Mt(e,t),xt.detach()),Nt[e]=n),n;}function Mt(e,t){var n=x(t.createElement(e)).appendTo(t.body),r=x.css(n[0],"display");return n.remove(),r;}x.each(["height","width"],function(e,t){x.cssHooks[t]={get:function(e,n,r){return n?0===e.offsetWidth&&bt.test(x.css(e,"display"))?x.swap(e,Et,function(){return Pt(e,t,r);}):Pt(e,t,r):undefined;},set:function(e,n,r){var i=r&&qt(e);return Ot(e,n,r?Ft(e,t,r,x.support.boxSizing&&"border-box"===x.css(e,"boxSizing",!1,i),i):0);}};}),x(function(){x.support.reliableMarginRight||(x.cssHooks.marginRight={get:function(e,t){return t?x.swap(e,{display:"inline-block"},vt,[e,"marginRight"]):undefined;}}),!x.support.pixelPosition&&x.fn.position&&x.each(["top","left"],function(e,t){x.cssHooks[t]={get:function(e,n){return n?(n=vt(e,t),Ct.test(n)?x(e).position()[t]+"px":n):undefined;}};});}),x.expr&&x.expr.filters&&(x.expr.filters.hidden=function(e){return 0>=e.offsetWidth&&0>=e.offsetHeight;},x.expr.filters.visible=function(e){return !x.expr.filters.hidden(e);}),x.each({margin:"",padding:"",border:"Width"},function(e,t){x.cssHooks[e+t]={expand:function(n){var r=0,i={},o="string"==typeof n?n.split(" "):[n];for(;4>r;r++){i[e+jt[r]+t]=o[r]||o[r-2]||o[0];}return i;}},wt.test(e)||(x.cssHooks[e+t].set=Ot);});var Wt=/%20/g,$t=/\[\]$/,Bt=/\r?\n/g,It=/^(?:submit|button|image|reset|file)$/i,zt=/^(?:input|select|textarea|keygen)/i;x.fn.extend({serialize:function(){return x.param(this.serializeArray());},serializeArray:function(){return this.map(function(){var e=x.prop(this,"elements");return e?x.makeArray(e):this;}).filter(function(){var e=this.type;return this.name&&!x(this).is(":disabled")&&zt.test(this.nodeName)&&!It.test(e)&&(this.checked||!ot.test(e));}).map(function(e,t){var n=x(this).val();return null==n?null:x.isArray(n)?x.map(n,function(e){return{name:t.name,value:e.replace(Bt,"\r\n")};}):{name:t.name,value:n.replace(Bt,"\r\n")};}).get();}}),x.param=function(e,t){var n,r=[],i=function(e,t){t=x.isFunction(t)?t():null==t?"":t,r[r.length]=encodeURIComponent(e)+"="+encodeURIComponent(t);};if(t===undefined&&(t=x.ajaxSettings&&x.ajaxSettings.traditional),x.isArray(e)||e.jquery&&!x.isPlainObject(e)){x.each(e,function(){i(this.name,this.value);});}else{for(n in e){_t(n,e[n],t,i);}}return r.join("&").replace(Wt,"+");};function _t(e,t,n,r){var i;if(x.isArray(t)){x.each(t,function(t,i){n||$t.test(e)?r(e,i):_t(e+"["+("object"==typeof i?t:"")+"]",i,n,r);});}else{if(n||"object"!==x.type(t)){r(e,t);}else{for(i in t){_t(e+"["+i+"]",t[i],n,r);}}}}x.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(e,t){x.fn[t]=function(e,n){return arguments.length>0?this.on(t,null,e,n):this.trigger(t);};}),x.fn.extend({hover:function(e,t){return this.mouseenter(e).mouseleave(t||e);},bind:function(e,t,n){return this.on(e,null,t,n);},unbind:function(e,t){return this.off(e,null,t);},delegate:function(e,t,n,r){return this.on(t,e,n,r);},undelegate:function(e,t,n){return 1===arguments.length?this.off(e,"**"):this.off(t,e||"**",n);}});var Xt,Ut,Yt=x.now(),Vt=/\?/,Gt=/#.*$/,Jt=/([?&])_=[^&]*/,Qt=/^(.*?):[ \t]*([^\r\n]*)$/gm,Kt=/^(?:about|app|app-storage|.+-extension|file|res|widget):$/,Zt=/^(?:GET|HEAD)$/,en=/^\/\//,tn=/^([\w.+-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,nn=x.fn.load,rn={},on={},sn="*/".concat("*");try{Ut=i.href;}catch(an){Ut=o.createElement("a"),Ut.href="",Ut=Ut.href;}Xt=tn.exec(Ut.toLowerCase())||[];function un(e){return function(t,n){"string"!=typeof t&&(n=t,t="*");var r,i=0,o=t.toLowerCase().match(w)||[];if(x.isFunction(n)){while(r=o[i++]){"+"===r[0]?(r=r.slice(1)||"*",(e[r]=e[r]||[]).unshift(n)):(e[r]=e[r]||[]).push(n);}}};}function ln(e,t,n,r){var i={},o=e===on;function s(a){var u;return i[a]=!0,x.each(e[a]||[],function(e,a){var l=a(t,n,r);return"string"!=typeof l||o||i[l]?o?!(u=l):undefined:(t.dataTypes.unshift(l),s(l),!1);}),u;}return s(t.dataTypes[0])||!i["*"]&&s("*");}function cn(e,t){var n,r,i=x.ajaxSettings.flatOptions||{};for(n in t){t[n]!==undefined&&((i[n]?e:r||(r={}))[n]=t[n]);}return r&&x.extend(!0,e,r),e;}x.fn.load=function(e,t,n){if("string"!=typeof e&&nn){return nn.apply(this,arguments);}var r,i,o,s=this,a=e.indexOf(" ");return a>=0&&(r=e.slice(a),e=e.slice(0,a)),x.isFunction(t)?(n=t,t=undefined):t&&"object"==typeof t&&(i="POST"),s.length>0&&x.ajax({url:e,type:i,dataType:"html",data:t}).done(function(e){o=arguments,s.html(r?x("<div>").append(x.parseHTML(e)).find(r):e);}).complete(n&&function(e,t){s.each(n,o||[e.responseText,t,e]);}),this;},x.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(e,t){x.fn[t]=function(e){return this.on(t,e);};}),x.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:Ut,type:"GET",isLocal:Kt.test(Xt[1]),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":sn,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":x.parseJSON,"text xml":x.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(e,t){return t?cn(cn(e,x.ajaxSettings),t):cn(x.ajaxSettings,e);},ajaxPrefilter:un(rn),ajaxTransport:un(on),ajax:function(e,t){"object"==typeof e&&(t=e,e=undefined),t=t||{};var n,r,i,o,s,a,u,l,c=x.ajaxSetup({},t),p=c.context||c,f=c.context&&(p.nodeType||p.jquery)?x(p):x.event,h=x.Deferred(),d=x.Callbacks("once memory"),g=c.statusCode||{},m={},y={},v=0,b="canceled",T={readyState:0,getResponseHeader:function(e){var t;if(2===v){if(!o){o={};while(t=Qt.exec(i)){o[t[1].toLowerCase()]=t[2];}}t=o[e.toLowerCase()];}return null==t?null:t;},getAllResponseHeaders:function(){return 2===v?i:null;},setRequestHeader:function(e,t){var n=e.toLowerCase();return v||(e=y[n]=y[n]||e,m[e]=t),this;},overrideMimeType:function(e){return v||(c.mimeType=e),this;},statusCode:function(e){var t;if(e){if(2>v){for(t in e){g[t]=[g[t],e[t]];}}else{T.always(e[T.status]);}}return this;},abort:function(e){var t=e||b;return n&&n.abort(t),k(0,t),this;}};if(h.promise(T).complete=d.add,T.success=T.done,T.error=T.fail,c.url=((e||c.url||Ut)+"").replace(Gt,"").replace(en,Xt[1]+"//"),c.type=t.method||t.type||c.method||c.type,c.dataTypes=x.trim(c.dataType||"*").toLowerCase().match(w)||[""],null==c.crossDomain&&(a=tn.exec(c.url.toLowerCase()),c.crossDomain=!(!a||a[1]===Xt[1]&&a[2]===Xt[2]&&(a[3]||("http:"===a[1]?"80":"443"))===(Xt[3]||("http:"===Xt[1]?"80":"443")))),c.data&&c.processData&&"string"!=typeof c.data&&(c.data=x.param(c.data,c.traditional)),ln(rn,c,t,T),2===v){return T;}u=c.global,u&&0===x.active++&&x.event.trigger("ajaxStart"),c.type=c.type.toUpperCase(),c.hasContent=!Zt.test(c.type),r=c.url,c.hasContent||(c.data&&(r=c.url+=(Vt.test(r)?"&":"?")+c.data,delete c.data),c.cache===!1&&(c.url=Jt.test(r)?r.replace(Jt,"$1_="+Yt++):r+(Vt.test(r)?"&":"?")+"_="+Yt++)),c.ifModified&&(x.lastModified[r]&&T.setRequestHeader("If-Modified-Since",x.lastModified[r]),x.etag[r]&&T.setRequestHeader("If-None-Match",x.etag[r])),(c.data&&c.hasContent&&c.contentType!==!1||t.contentType)&&T.setRequestHeader("Content-Type",c.contentType),T.setRequestHeader("Accept",c.dataTypes[0]&&c.accepts[c.dataTypes[0]]?c.accepts[c.dataTypes[0]]+("*"!==c.dataTypes[0]?", "+sn+"; q=0.01":""):c.accepts["*"]);for(l in c.headers){T.setRequestHeader(l,c.headers[l]);}if(c.beforeSend&&(c.beforeSend.call(p,T,c)===!1||2===v)){return T.abort();}b="abort";for(l in {success:1,error:1,complete:1}){T[l](c[l]);}if(n=ln(on,c,t,T)){T.readyState=1,u&&f.trigger("ajaxSend",[T,c]),c.async&&c.timeout>0&&(s=setTimeout(function(){T.abort("timeout");},c.timeout));try{v=1,n.send(m,k);}catch(C){if(!(2>v)){throw C;}k(-1,C);}}else{k(-1,"No Transport");}function k(e,t,o,a){var l,m,y,b,w,C=t;2!==v&&(v=2,s&&clearTimeout(s),n=undefined,i=a||"",T.readyState=e>0?4:0,l=e>=200&&300>e||304===e,o&&(b=pn(c,T,o)),b=fn(c,b,T,l),l?(c.ifModified&&(w=T.getResponseHeader("Last-Modified"),w&&(x.lastModified[r]=w),w=T.getResponseHeader("etag"),w&&(x.etag[r]=w)),204===e||"HEAD"===c.type?C="nocontent":304===e?C="notmodified":(C=b.state,m=b.data,y=b.error,l=!y)):(y=C,(e||!C)&&(C="error",0>e&&(e=0))),T.status=e,T.statusText=(t||C)+"",l?h.resolveWith(p,[m,C,T]):h.rejectWith(p,[T,C,y]),T.statusCode(g),g=undefined,u&&f.trigger(l?"ajaxSuccess":"ajaxError",[T,c,l?m:y]),d.fireWith(p,[T,C]),u&&(f.trigger("ajaxComplete",[T,c]),--x.active||x.event.trigger("ajaxStop")));}return T;},getJSON:function(e,t,n){return x.get(e,t,n,"json");},getScript:function(e,t){return x.get(e,undefined,t,"script");}}),x.each(["get","post"],function(e,t){x[t]=function(e,n,r,i){return x.isFunction(n)&&(i=i||r,r=n,n=undefined),x.ajax({url:e,type:t,dataType:i,data:n,success:r});};});function pn(e,t,n){var r,i,o,s,a=e.contents,u=e.dataTypes;while("*"===u[0]){u.shift(),r===undefined&&(r=e.mimeType||t.getResponseHeader("Content-Type"));}if(r){for(i in a){if(a[i]&&a[i].test(r)){u.unshift(i);break;}}}if(u[0] in n){o=u[0];}else{for(i in n){if(!u[0]||e.converters[i+" "+u[0]]){o=i;break;}s||(s=i);}o=o||s;}return o?(o!==u[0]&&u.unshift(o),n[o]):undefined;}function fn(e,t,n,r){var i,o,s,a,u,l={},c=e.dataTypes.slice();if(c[1]){for(s in e.converters){l[s.toLowerCase()]=e.converters[s];}}o=c.shift();while(o){if(e.responseFields[o]&&(n[e.responseFields[o]]=t),!u&&r&&e.dataFilter&&(t=e.dataFilter(t,e.dataType)),u=o,o=c.shift()){if("*"===o){o=u;}else{if("*"!==u&&u!==o){if(s=l[u+" "+o]||l["* "+o],!s){for(i in l){if(a=i.split(" "),a[1]===o&&(s=l[u+" "+a[0]]||l["* "+a[0]])){s===!0?s=l[i]:l[i]!==!0&&(o=a[0],c.unshift(a[1]));break;}}}if(s!==!0){if(s&&e["throws"]){t=s(t);}else{try{t=s(t);}catch(p){return{state:"parsererror",error:s?p:"No conversion from "+u+" to "+o};}}}}}}}return{state:"success",data:t};}x.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/(?:java|ecma)script/},converters:{"text script":function(e){return x.globalEval(e),e;}}}),x.ajaxPrefilter("script",function(e){e.cache===undefined&&(e.cache=!1),e.crossDomain&&(e.type="GET");}),x.ajaxTransport("script",function(e){if(e.crossDomain){var t,n;return{send:function(r,i){t=x("<script>").prop({async:!0,charset:e.scriptCharset,src:e.url}).on("load error",n=function(e){t.remove(),n=null,e&&i("error"===e.type?404:200,e.type);}),o.head.appendChild(t[0]);},abort:function(){n&&n();}};}});var hn=[],dn=/(=)\?(?=&|$)|\?\?/;x.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var e=hn.pop()||x.expando+"_"+Yt++;return this[e]=!0,e;}}),x.ajaxPrefilter("json jsonp",function(t,n,r){var i,o,s,a=t.jsonp!==!1&&(dn.test(t.url)?"url":"string"==typeof t.data&&!(t.contentType||"").indexOf("application/x-www-form-urlencoded")&&dn.test(t.data)&&"data");return a||"jsonp"===t.dataTypes[0]?(i=t.jsonpCallback=x.isFunction(t.jsonpCallback)?t.jsonpCallback():t.jsonpCallback,a?t[a]=t[a].replace(dn,"$1"+i):t.jsonp!==!1&&(t.url+=(Vt.test(t.url)?"&":"?")+t.jsonp+"="+i),t.converters["script json"]=function(){return s||x.error(i+" was not called"),s[0];},t.dataTypes[0]="json",o=e[i],e[i]=function(){s=arguments;},r.always(function(){e[i]=o,t[i]&&(t.jsonpCallback=n.jsonpCallback,hn.push(i)),s&&x.isFunction(o)&&o(s[0]),s=o=undefined;}),"script"):undefined;}),x.ajaxSettings.xhr=function(){try{return new XMLHttpRequest;}catch(e){}};var gn=x.ajaxSettings.xhr(),mn={0:200,1223:204},yn=0,vn={};e.ActiveXObject&&x(e).on("unload",function(){for(var e in vn){vn[e]();}vn=undefined;}),x.support.cors=!!gn&&"withCredentials" in gn,x.support.ajax=gn=!!gn,x.ajaxTransport(function(e){var t;return x.support.cors||gn&&!e.crossDomain?{send:function(n,r){var i,o,s=e.xhr();if(s.open(e.type,e.url,e.async,e.username,e.password),e.xhrFields){for(i in e.xhrFields){s[i]=e.xhrFields[i];}}e.mimeType&&s.overrideMimeType&&s.overrideMimeType(e.mimeType),e.crossDomain||n["X-Requested-With"]||(n["X-Requested-With"]="XMLHttpRequest");for(i in n){s.setRequestHeader(i,n[i]);}t=function(e){return function(){t&&(delete vn[o],t=s.onload=s.onerror=null,"abort"===e?s.abort():"error"===e?r(s.status||404,s.statusText):r(mn[s.status]||s.status,s.statusText,"string"==typeof s.responseText?{text:s.responseText}:undefined,s.getAllResponseHeaders()));};},s.onload=t(),s.onerror=t("error"),t=vn[o=yn++]=t("abort"),s.send(e.hasContent&&e.data||null);},abort:function(){t&&t();}}:undefined;});var xn,bn,wn=/^(?:toggle|show|hide)$/,Tn=RegExp("^(?:([+-])=|)("+b+")([a-z%]*)$","i"),Cn=/queueHooks$/,kn=[An],Nn={"*":[function(e,t){var n=this.createTween(e,t),r=n.cur(),i=Tn.exec(t),o=i&&i[3]||(x.cssNumber[e]?"":"px"),s=(x.cssNumber[e]||"px"!==o&&+r)&&Tn.exec(x.css(n.elem,e)),a=1,u=20;if(s&&s[3]!==o){o=o||s[3],i=i||[],s=+r||1;do{a=a||".5",s/=a,x.style(n.elem,e,s+o);}while(a!==(a=n.cur()/r)&&1!==a&&--u);}return i&&(s=n.start=+s||+r||0,n.unit=o,n.end=i[1]?s+(i[1]+1)*i[2]:+i[2]),n;}]};function En(){return setTimeout(function(){xn=undefined;}),xn=x.now();}function Sn(e,t,n){var r,i=(Nn[t]||[]).concat(Nn["*"]),o=0,s=i.length;for(;s>o;o++){if(r=i[o].call(n,t,e)){return r;}}}function jn(e,t,n){var r,i,o=0,s=kn.length,a=x.Deferred().always(function(){delete u.elem;}),u=function(){if(i){return !1;}var t=xn||En(),n=Math.max(0,l.startTime+l.duration-t),r=n/l.duration||0,o=1-r,s=0,u=l.tweens.length;for(;u>s;s++){l.tweens[s].run(o);}return a.notifyWith(e,[l,o,n]),1>o&&u?n:(a.resolveWith(e,[l]),!1);},l=a.promise({elem:e,props:x.extend({},t),opts:x.extend(!0,{specialEasing:{}},n),originalProperties:t,originalOptions:n,startTime:xn||En(),duration:n.duration,tweens:[],createTween:function(t,n){var r=x.Tween(e,l.opts,t,n,l.opts.specialEasing[t]||l.opts.easing);return l.tweens.push(r),r;},stop:function(t){var n=0,r=t?l.tweens.length:0;if(i){return this;}for(i=!0;r>n;n++){l.tweens[n].run(1);}return t?a.resolveWith(e,[l,t]):a.rejectWith(e,[l,t]),this;}}),c=l.props;for(Dn(c,l.opts.specialEasing);s>o;o++){if(r=kn[o].call(l,e,c,l.opts)){return r;}}return x.map(c,Sn,l),x.isFunction(l.opts.start)&&l.opts.start.call(e,l),x.fx.timer(x.extend(u,{elem:e,anim:l,queue:l.opts.queue})),l.progress(l.opts.progress).done(l.opts.done,l.opts.complete).fail(l.opts.fail).always(l.opts.always);}function Dn(e,t){var n,r,i,o,s;for(n in e){if(r=x.camelCase(n),i=t[r],o=e[n],x.isArray(o)&&(i=o[1],o=e[n]=o[0]),n!==r&&(e[r]=o,delete e[n]),s=x.cssHooks[r],s&&"expand" in s){o=s.expand(o),delete e[r];for(n in o){n in e||(e[n]=o[n],t[n]=i);}}else{t[r]=i;}}}x.Animation=x.extend(jn,{tweener:function(e,t){x.isFunction(e)?(t=e,e=["*"]):e=e.split(" ");var n,r=0,i=e.length;for(;i>r;r++){n=e[r],Nn[n]=Nn[n]||[],Nn[n].unshift(t);}},prefilter:function(e,t){t?kn.unshift(e):kn.push(e);}});function An(e,t,n){var r,i,o,s,a,u,l=this,c={},p=e.style,f=e.nodeType&&Lt(e),h=q.get(e,"fxshow");n.queue||(a=x._queueHooks(e,"fx"),null==a.unqueued&&(a.unqueued=0,u=a.empty.fire,a.empty.fire=function(){a.unqueued||u();}),a.unqueued++,l.always(function(){l.always(function(){a.unqueued--,x.queue(e,"fx").length||a.empty.fire();});})),1===e.nodeType&&("height" in t||"width" in t)&&(n.overflow=[p.overflow,p.overflowX,p.overflowY],"inline"===x.css(e,"display")&&"none"===x.css(e,"float")&&(p.display="inline-block")),n.overflow&&(p.overflow="hidden",l.always(function(){p.overflow=n.overflow[0],p.overflowX=n.overflow[1],p.overflowY=n.overflow[2];}));for(r in t){if(i=t[r],wn.exec(i)){if(delete t[r],o=o||"toggle"===i,i===(f?"hide":"show")){if("show"!==i||!h||h[r]===undefined){continue;}f=!0;}c[r]=h&&h[r]||x.style(e,r);}}if(!x.isEmptyObject(c)){h?"hidden" in h&&(f=h.hidden):h=q.access(e,"fxshow",{}),o&&(h.hidden=!f),f?x(e).show():l.done(function(){x(e).hide();}),l.done(function(){var t;q.remove(e,"fxshow");for(t in c){x.style(e,t,c[t]);}});for(r in c){s=Sn(f?h[r]:0,r,l),r in h||(h[r]=s.start,f&&(s.end=s.start,s.start="width"===r||"height"===r?1:0));}}}function Ln(e,t,n,r,i){return new Ln.prototype.init(e,t,n,r,i);}x.Tween=Ln,Ln.prototype={constructor:Ln,init:function(e,t,n,r,i,o){this.elem=e,this.prop=n,this.easing=i||"swing",this.options=t,this.start=this.now=this.cur(),this.end=r,this.unit=o||(x.cssNumber[n]?"":"px");},cur:function(){var e=Ln.propHooks[this.prop];return e&&e.get?e.get(this):Ln.propHooks._default.get(this);},run:function(e){var t,n=Ln.propHooks[this.prop];return this.pos=t=this.options.duration?x.easing[this.easing](e,this.options.duration*e,0,1,this.options.duration):e,this.now=(this.end-this.start)*t+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),n&&n.set?n.set(this):Ln.propHooks._default.set(this),this;}},Ln.prototype.init.prototype=Ln.prototype,Ln.propHooks={_default:{get:function(e){var t;return null==e.elem[e.prop]||e.elem.style&&null!=e.elem.style[e.prop]?(t=x.css(e.elem,e.prop,""),t&&"auto"!==t?t:0):e.elem[e.prop];},set:function(e){x.fx.step[e.prop]?x.fx.step[e.prop](e):e.elem.style&&(null!=e.elem.style[x.cssProps[e.prop]]||x.cssHooks[e.prop])?x.style(e.elem,e.prop,e.now+e.unit):e.elem[e.prop]=e.now;}}},Ln.propHooks.scrollTop=Ln.propHooks.scrollLeft={set:function(e){e.elem.nodeType&&e.elem.parentNode&&(e.elem[e.prop]=e.now);}},x.each(["toggle","show","hide"],function(e,t){var n=x.fn[t];x.fn[t]=function(e,r,i){return null==e||"boolean"==typeof e?n.apply(this,arguments):this.animate(qn(t,!0),e,r,i);};}),x.fn.extend({fadeTo:function(e,t,n,r){return this.filter(Lt).css("opacity",0).show().end().animate({opacity:t},e,n,r);},animate:function(e,t,n,r){var i=x.isEmptyObject(e),o=x.speed(t,n,r),s=function(){var t=jn(this,x.extend({},e),o);(i||q.get(this,"finish"))&&t.stop(!0);};return s.finish=s,i||o.queue===!1?this.each(s):this.queue(o.queue,s);},stop:function(e,t,n){var r=function(e){var t=e.stop;delete e.stop,t(n);};return"string"!=typeof e&&(n=t,t=e,e=undefined),t&&e!==!1&&this.queue(e||"fx",[]),this.each(function(){var t=!0,i=null!=e&&e+"queueHooks",o=x.timers,s=q.get(this);if(i){s[i]&&s[i].stop&&r(s[i]);}else{for(i in s){s[i]&&s[i].stop&&Cn.test(i)&&r(s[i]);}}for(i=o.length;i--;){o[i].elem!==this||null!=e&&o[i].queue!==e||(o[i].anim.stop(n),t=!1,o.splice(i,1));}(t||!n)&&x.dequeue(this,e);});},finish:function(e){return e!==!1&&(e=e||"fx"),this.each(function(){var t,n=q.get(this),r=n[e+"queue"],i=n[e+"queueHooks"],o=x.timers,s=r?r.length:0;for(n.finish=!0,x.queue(this,e,[]),i&&i.stop&&i.stop.call(this,!0),t=o.length;t--;){o[t].elem===this&&o[t].queue===e&&(o[t].anim.stop(!0),o.splice(t,1));}for(t=0;s>t;t++){r[t]&&r[t].finish&&r[t].finish.call(this);}delete n.finish;});}});function qn(e,t){var n,r={height:e},i=0;for(t=t?1:0;4>i;i+=2-t){n=jt[i],r["margin"+n]=r["padding"+n]=e;}return t&&(r.opacity=r.width=e),r;}x.each({slideDown:qn("show"),slideUp:qn("hide"),slideToggle:qn("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(e,t){x.fn[e]=function(e,n,r){return this.animate(t,e,n,r);};}),x.speed=function(e,t,n){var r=e&&"object"==typeof e?x.extend({},e):{complete:n||!n&&t||x.isFunction(e)&&e,duration:e,easing:n&&t||t&&!x.isFunction(t)&&t};return r.duration=x.fx.off?0:"number"==typeof r.duration?r.duration:r.duration in x.fx.speeds?x.fx.speeds[r.duration]:x.fx.speeds._default,(null==r.queue||r.queue===!0)&&(r.queue="fx"),r.old=r.complete,r.complete=function(){x.isFunction(r.old)&&r.old.call(this),r.queue&&x.dequeue(this,r.queue);},r;},x.easing={linear:function(e){return e;},swing:function(e){return 0.5-Math.cos(e*Math.PI)/2;}},x.timers=[],x.fx=Ln.prototype.init,x.fx.tick=function(){var e,t=x.timers,n=0;for(xn=x.now();t.length>n;n++){e=t[n],e()||t[n]!==e||t.splice(n--,1);}t.length||x.fx.stop(),xn=undefined;},x.fx.timer=function(e){e()&&x.timers.push(e)&&x.fx.start();},x.fx.interval=13,x.fx.start=function(){bn||(bn=setInterval(x.fx.tick,x.fx.interval));},x.fx.stop=function(){clearInterval(bn),bn=null;},x.fx.speeds={slow:600,fast:200,_default:400},x.fx.step={},x.expr&&x.expr.filters&&(x.expr.filters.animated=function(e){return x.grep(x.timers,function(t){return e===t.elem;}).length;}),x.fn.offset=function(e){if(arguments.length){return e===undefined?this:this.each(function(t){x.offset.setOffset(this,e,t);});}var t,n,i=this[0],o={top:0,left:0},s=i&&i.ownerDocument;if(s){return t=s.documentElement,x.contains(t,i)?(typeof i.getBoundingClientRect!==r&&(o=i.getBoundingClientRect()),n=Hn(s),{top:o.top+n.pageYOffset-t.clientTop,left:o.left+n.pageXOffset-t.clientLeft}):o;}},x.offset={setOffset:function(e,t,n){var r,i,o,s,a,u,l,c=x.css(e,"position"),p=x(e),f={};"static"===c&&(e.style.position="relative"),a=p.offset(),o=x.css(e,"top"),u=x.css(e,"left"),l=("absolute"===c||"fixed"===c)&&(o+u).indexOf("auto")>-1,l?(r=p.position(),s=r.top,i=r.left):(s=parseFloat(o)||0,i=parseFloat(u)||0),x.isFunction(t)&&(t=t.call(e,n,a)),null!=t.top&&(f.top=t.top-a.top+s),null!=t.left&&(f.left=t.left-a.left+i),"using" in t?t.using.call(e,f):p.css(f);}},x.fn.extend({position:function(){if(this[0]){var e,t,n=this[0],r={top:0,left:0};return"fixed"===x.css(n,"position")?t=n.getBoundingClientRect():(e=this.offsetParent(),t=this.offset(),x.nodeName(e[0],"html")||(r=e.offset()),r.top+=x.css(e[0],"borderTopWidth",!0),r.left+=x.css(e[0],"borderLeftWidth",!0)),{top:t.top-r.top-x.css(n,"marginTop",!0),left:t.left-r.left-x.css(n,"marginLeft",!0)};}},offsetParent:function(){return this.map(function(){var e=this.offsetParent||s;while(e&&!x.nodeName(e,"html")&&"static"===x.css(e,"position")){e=e.offsetParent;}return e||s;});}}),x.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(t,n){var r="pageYOffset"===n;x.fn[t]=function(i){return x.access(this,function(t,i,o){var s=Hn(t);return o===undefined?s?s[n]:t[i]:(s?s.scrollTo(r?e.pageXOffset:o,r?o:e.pageYOffset):t[i]=o,undefined);},t,i,arguments.length,null);};});function Hn(e){return x.isWindow(e)?e:9===e.nodeType&&e.defaultView;}x.each({Height:"height",Width:"width"},function(e,t){x.each({padding:"inner"+e,content:t,"":"outer"+e},function(n,r){x.fn[r]=function(r,i){var o=arguments.length&&(n||"boolean"!=typeof r),s=n||(r===!0||i===!0?"margin":"border");return x.access(this,function(t,n,r){var i;return x.isWindow(t)?t.document.documentElement["client"+e]:9===t.nodeType?(i=t.documentElement,Math.max(t.body["scroll"+e],i["scroll"+e],t.body["offset"+e],i["offset"+e],i["client"+e])):r===undefined?x.css(t,n,s):x.style(t,n,r,s);},t,o?r:undefined,o,null);};});}),x.fn.size=function(){return this.length;},x.fn.andSelf=x.fn.addBack,"object"==typeof module&&module&&"object"==typeof module.exports?module.exports=x:"function"==typeof define&&define.amd&&define("jquery",[],function(){return x;}),"object"==typeof e&&"object"==typeof e.document&&(e.jQuery=e.$=x);})(window);(function(aG,ae,Z,ao){var ac="virtualMouseBindings",T="virtualTouchID",i="vmouseover vmousedown vmousemove vmouseup vclick vmouseout vmousecancel".split(" "),aF="clientX clientY pageX pageY screenX screenY".split(" "),W=aG.event.mouseHooks?aG.event.mouseHooks.props:[],aH=aG.event.props.concat(W),S={},ag=0,aB=0,az=0,av=false,al=[],ad=false,aA=false,aD="addEventListener" in Z,aC=aG(Z),aa=1,ar=0,V;aG.vmouse={moveDistanceThreshold:10,clickDistanceThreshold:10,resetTimerDuration:1500};function ax(a){while(a&&typeof a.originalEvent!=="undefined"){a=a.originalEvent;}return a;}function af(f,g){var c=f.type,d,b,h,e,m,l,k,j,a;f=aG.Event(f);f.type=g;d=f.originalEvent;b=aG.event.props;if(c.search(/^(mouse|click)/)>-1){b=aH;}if(d){for(k=b.length,e;k;){e=b[--k];f[e]=d[e];}}if(c.search(/mouse(down|up)|click/)>-1&&!f.which){f.which=1;}if(c.search(/^touch/)!==-1){h=ax(d);c=h.touches;m=h.changedTouches;l=(c&&c.length)?c[0]:((m&&m.length)?m[0]:ao);if(l){for(j=0,a=aF.length;j<a;j++){e=aF[j];f[e]=l[e];}}}return f;}function aw(d){var b={},a,c;while(d){a=aG.data(d,ac);for(c in a){if(a[c]){b[c]=b.hasVirtualBinding=true;}}d=d.parentNode;}return b;}function U(c,b){var a;while(c){a=aG.data(c,ac);if(a&&(!b||a[b])){return c;}c=c.parentNode;}return null;}function aj(){aA=false;}function ak(){aA=true;}function ay(){ar=0;al.length=0;ad=false;ak();}function at(){aj();}function aE(){aI();ag=setTimeout(function(){ag=0;ay();},aG.vmouse.resetTimerDuration);}function aI(){if(ag){clearTimeout(ag);ag=0;}}function aq(c,d,a){var b;if((a&&a[c])||(!a&&U(d.target,c))){b=af(d,c);aG(d.target).trigger(b);}return b;}function ai(b){var c=aG.data(b.target,T);if(!ad&&(!ar||ar!==c)){var a=aq("v"+b.type,b);if(a){if(a.isDefaultPrevented()){b.preventDefault();}if(a.isPropagationStopped()){b.stopPropagation();}if(a.isImmediatePropagationStopped()){b.stopImmediatePropagation();}}}}function au(c){var e=ax(c).touches,d,a;if(e&&e.length===1){d=c.target;a=aw(d);if(a.hasVirtualBinding){ar=aa++;aG.data(d,T,ar);aI();at();av=false;var b=ax(c).touches[0];aB=b.pageX;az=b.pageY;aq("vmouseover",c,a);aq("vmousedown",c,a);}}}function ah(a){if(aA){return;}if(!av){aq("vmousecancel",a,aw(a.target));}av=true;aE();}function X(e){if(aA){return;}var c=ax(e).touches[0],b=av,d=aG.vmouse.moveDistanceThreshold,a=aw(e.target);av=av||(Math.abs(c.pageX-aB)>d||Math.abs(c.pageY-az)>d);if(av&&!b){aq("vmousecancel",e,a);}aq("vmousemove",e,a);aE();}function ab(d){if(aA){return;}ak();var a=aw(d.target),c;aq("vmouseup",d,a);if(!av){var b=aq("vclick",d,a);if(b&&b.isDefaultPrevented()){c=ax(d).changedTouches[0];al.push({touchID:ar,x:c.clientX,y:c.clientY});ad=true;}}aq("vmouseout",d,a);av=false;aE();}function Y(b){var c=aG.data(b,ac),a;if(c){for(a in c){if(c[a]){return true;}}}return false;}function ap(){}function am(a){var b=a.substr(1);return{setup:function(d,c){if(!Y(this)){aG.data(this,ac,{});}var e=aG.data(this,ac);e[a]=true;S[a]=(S[a]||0)+1;if(S[a]===1){aC.bind(b,ai);}aG(this).bind(b,ap);if(aD){S.touchstart=(S.touchstart||0)+1;if(S.touchstart===1){aC.bind("touchstart",au).bind("touchend",ab).bind("touchmove",X).bind("scroll",ah);}}},teardown:function(d,c){--S[a];if(!S[a]){aC.unbind(b,ai);}if(aD){--S.touchstart;if(!S.touchstart){aC.unbind("touchstart",au).unbind("touchmove",X).unbind("touchend",ab).unbind("scroll",ah);}}var e=aG(this),f=aG.data(this,ac);if(f){f[a]=false;}e.unbind(b,ap);if(!Y(this)){e.removeData(ac);}}};}for(var an=0;an<i.length;an++){aG.event.special[i[an]]=am(i[an]);}if(aD){Z.addEventListener("click",function(f){var c=al.length,g=f.target,j,h,a,e,b,d;if(c){j=f.clientX;h=f.clientY;V=aG.vmouse.clickDistanceThreshold;a=g;while(a){for(e=0;e<c;e++){b=al[e];d=0;if((a===g&&Math.abs(b.x-j)<V&&Math.abs(b.y-h)<V)||aG.data(a,T)===b.touchID){f.preventDefault();f.stopPropagation();return;}}a=a.parentNode;}}},true);}})(jQuery,window,document);(function(n,s,k){var l=n(document);n.each(("touchstart touchmove touchend tap taphold swipe swipeleft swiperight scrollstart scrollstop").split(" "),function(b,a){n.fn[a]=function(c){return c?this.bind(a,c):this.trigger(a);};if(n.attrFn){n.attrFn[a]=true;}});var o=("ontouchend" in document),p="touchmove scroll",t=o?"touchstart":"mousedown",r=o?"touchend":"mouseup",m=o?"touchmove":"mousemove";function q(d,a,c){var b=c.type;c.type=a;n.event.dispatch.call(d,c);c.type=b;}n.event.special.scrollstart={enabled:true,setup:function(){var a=this,d=n(a),c,e;function b(f,g){c=g;q(a,c?"scrollstart":"scrollstop",f);}d.bind(p,function(f){if(!n.event.special.scrollstart.enabled){return;}if(!c){b(f,true);}clearTimeout(e);e=setTimeout(function(){b(f,false);},50);});}};n.event.special.tap={tapholdThreshold:750,setup:function(){var a=this,b=n(a);b.bind("vmousedown",function(f){if(f.which&&f.which!==1){return false;}var e=f.target,c=f.originalEvent,i;function d(){clearTimeout(i);}function h(){d();b.unbind("vclick",g).unbind("vmouseup",d);l.unbind("vmousecancel",h);}function g(j){h();if(e===j.target){q(a,"tap",j);}}b.bind("vmouseup",d).bind("vclick",g);l.bind("vmousecancel",h);i=setTimeout(function(){q(a,"taphold",n.Event("taphold",{target:e}));},n.event.special.tap.tapholdThreshold);});}};n.event.special.swipe={scrollSupressionThreshold:30,durationThreshold:1000,horizontalDistanceThreshold:30,verticalDistanceThreshold:75,start:function(a){var b=a.originalEvent.touches?a.originalEvent.touches[0]:a;return{time:(new Date()).getTime(),coords:[b.pageX,b.pageY],origin:n(a.target)};},stop:function(a){var b=a.originalEvent.touches?a.originalEvent.touches[0]:a;return{time:(new Date()).getTime(),coords:[b.pageX,b.pageY]};},handleSwipe:function(b,a){if(a.time-b.time<n.event.special.swipe.durationThreshold&&Math.abs(b.coords[0]-a.coords[0])>n.event.special.swipe.horizontalDistanceThreshold&&Math.abs(b.coords[1]-a.coords[1])<n.event.special.swipe.verticalDistanceThreshold){b.origin.trigger("swipe").trigger(b.coords[0]>a.coords[0]?"swipeleft":"swiperight");}},setup:function(){var a=this,b=n(a);b.bind(t,function(d){var f=n.event.special.swipe.start(d),c;function e(g){if(!f){return;}c=n.event.special.swipe.stop(g);if(Math.abs(f.coords[0]-c.coords[0])>n.event.special.swipe.scrollSupressionThreshold){g.preventDefault();}}b.bind(m,e).one(r,function(){b.unbind(m,e);if(f&&c){n.event.special.swipe.handleSwipe(f,c);}f=c=k;});});}};n.each({scrollstop:"scrollstart",taphold:"tap",swipeleft:"swipe",swiperight:"swipe"},function(b,a){n.event.special[b]={setup:function(){n(this).bind(a,n.noop);}};});})(jQuery,this);$.noConflict();


define("jquery", function(require, exports, module){
	module.exports = jQuery;
});
define("utils.viewEx", function(req,exp){
    "use strict";
	var app = req("sys.app");

	exp.alert = function(){
		var args = [].slice.call(arguments);
		app.plugin.dialog.alert.apply(null,args);
	};

    exp.confirm = function(){
        var args = [].slice.call(arguments);
        app.plugin.dialog.confirm.apply(null,args);
    };

    exp.tip = function () {
        var args = [].slice.call(arguments);
        app.plugin.tip.showTip.apply(app.plugin.tip, [].slice.call(arguments));
    }
});
/**
 * 格式化扩展
 * Created by likaituan on 16/8/31.
 */


define("utils.filter", function(req, exp) {
    "use strict";
    //外国日期格式化
    exp.timestamp2Date = function (timestampArg) {

        var timestamp = timestampArg < 0 ? -timestampArg : timestampArg;

        if (timestamp&&/^\d+$/.test(timestamp)) {
            var date = new Date();

            var getTimeFilter = function(i){
                if(i<10){
                    i = "0" + i;
                }
                return i;
            };

            date.setTime(timestamp);
            var year = date.getFullYear();
            var month = date.getMonth() + 1;
            month = getTimeFilter(month);
            var day = getTimeFilter(date.getDate());

            var hours = getTimeFilter(date.getHours());
            var minutes = getTimeFilter(date.getMinutes());
            var seconds = getTimeFilter(date.getSeconds());

            var clock = hours + ":" + minutes + ":" + seconds;

            return year + "-" + month + "-" + day + "/" + clock;
        } else {
            return timestamp;
        }
    };

    /*生日格式化*/
    exp.birthdayFilter = function (timestampArg) {

        var timestamp = timestampArg < 0 ? -timestampArg : timestampArg;

        if (timestamp&&/^\d+$/.test(timestamp)) {
            var date = new Date();
            var getTimeFilter = function(i){
                if(i<10){
                    i = "0" + i;
                }
                return i;
            };

            date.setTime(timestamp);
            var year = date.getFullYear();
            var month = date.getMonth() + 1;
            month = getTimeFilter(month);
            var day = getTimeFilter(date.getDate());

            return day + "-" + month + "-" + year;
        } else {
            return timestamp;
        }
    };

    exp.moneyBZFilter = function (amount) {

        if(amount&&/^\d+$/.test(amount)){
            var addSeparator = function (amountStr, separator) {
                if (amountStr.length <= 3) {
                    return amountStr;
                }
                var reverseStr = amountStr.split("").reverse().join("");

                var tmp = "";

                for (var i = 0; i < reverseStr.length; ++i) {
                    tmp += reverseStr.charAt(i);

                    if (i % 3 == 2) {
                        tmp += separator;
                    }
                }

                return tmp.split("").reverse().join("");

            };
            var amountFormat = function (centValue, intSeparator, decimalSeparator) {
                var decimalStr = (centValue / 100).toFixed(2).toString();

                var split = decimalStr.split(".");

                var intStr = split[0];
                var decStr = split[1];

                return "R$" + addSeparator(intStr, intSeparator) + decimalSeparator + decStr;

            };

            return amountFormat(amount, ".", ",");
        }else{
            return amount;
        }
    };

    /*CPF格式转化*/
    exp.cpfFormat = function (cpf) {
        var n_cpf = cpf.replace(/[^0-9]/g,'');
        if(n_cpf.length>11){
            n_cpf = n_cpf.substring(0,11);
        }
        var len = n_cpf.length;
        if(len<=6&&len>3){
            return ( n_cpf.substring(0,3)+ "." + n_cpf.substring(3,len) );
        }else if(len>6&&len<=9){
            return ( n_cpf.substring(0,3)+ "." + n_cpf.substring(3,6) + "." + n_cpf.substring(6,len));
        }else if(len>9&&len<=11){
            return ( n_cpf.substring(0,3)+"." + n_cpf.substring(3,6) + "." + n_cpf.substring(6,9) + "-" + n_cpf.substring(9,len) );
        }else{
            return n_cpf;
        }
    };

});define("utils.ajax", function(req,exp,mod){
	"use strict";
	var emit = req("utils.emit");

    var service = function(uri){
        return emit(uri, "service");
    };

    mod.exports = {
        login: service("login"),                   /*登陆*/
        register: service("register"),             /*注册短信验证码等*/
        getVerify: service("getVerify"),           /*验证码*/
        verifyCheck: service("verifyCheck"),       /*校验验证码*/
        activation: service("activation"),         /*邮箱激活*/
        reSend: service("reSend"),                 /*重新激活*/
        resetpassword: service("resetpassword"),   /*重置密码*/
        getVideoList:service("getVideoList"),      //获取视频列表
        uploadVideo: service("uploadVideo"),       //上传视频列表
        searchByName:service("searchByName"),       //搜索视频通过姓名（列表页）
        getVideoDetail:service("getVideoDetail"),   //获取视频详情页
        searchByTag:service("searchByTag"),         //搜索视频通过标签名（详情页）
        deleteVideo:service("deleteVideo"),         //删除视频
        getUserInfo:service("getUserInfo"),         //获得用户信息
        getToken:service("getToken"),
        _end_: 0
	};

});
/**
 * 统一发送service
 * Created by likaituan on 15/7/31.
 */

define("utils.emit", function(req, exp, mod){
    "use strict";
    var ajax = req("jquery").ajax;
    var filter = req("sys.filter");
    var config = req("root.config");
    var testData = {};

    var host = "";

    //发送
    mod.exports = function(uri, path){
        path = path || "service";

        return function(params, callback) {
            if(arguments.length==1){
                callback = params;
                params = {};
            }
            var successCallback = config.ajaxRes(callback, params);
            if(testData[uri]) {
                return successCallback(testData[uri]);
            }
            ajax({
                url: "/" + path + "/" + uri,
                type: "post",
                data: filter.filter(params, "typeof($item) != 'object'"),
                success: successCallback
            });
        }
    };

});define("utils.testData", {
    //"weixin/config": {"code":0,"data":{"signature":"870b3f9e62f299d6032e5614c846bc270f2fcefe","appId":"wxc95bc5bc5102239a","url":"http://10.0.0.126:8000/activitys/","nonceStr":"92d9fbc6-1449-4896-af1e-ef518cb14456","timestamp":"1446692170"},"message":"成功"},
    //"dream/getHome": {"code":0,"data":{"msgList":[{type:"wecash_register_yield_msg",content:"3000"},{type:"register_experience_msg",content:"3000"}],"dreams":[{"id":-8,"target":"车贷宝","targetAmount":1200000,"expectedTime":"2016-04-12","investAmount":0,"principal":0,"couponAmount":0,"earnings":0,"rewardAmount":0,"totalRewardAmount":0,"dreamFund":0,"status":1,"complete":false,"timestamp":"2016-01-11","investmentType":8,"yesterdayEarned":0,"totalEarnings":0,"intervalDay":93,"expirationTimeStr":"到期时间2016-04-12","mobilityStr":"3个月","yield":8.8,"cycleYield":8.8,"rewardYield":0,"commonYield":0,"extraYield":0,"cumulativeReward":0,"isDeposit":false,"expectedReward":0},{"id":-7,"target":"金猪宝","targetAmount":1000000,"expectedTime":"2016-07-12","investAmount":0,"principal":0,"couponAmount":0,"earnings":0,"rewardAmount":0,"totalRewardAmount":0,"dreamFund":0,"status":1,"complete":false,"timestamp":"2016-01-11","investmentType":7,"yesterdayEarned":0,"totalEarnings":0,"intervalDay":184,"expirationTimeStr":"到期时间2016-07-12","mobilityStr":"6个月","yield":9,"cycleYield":9,"rewardYield":0,"commonYield":0,"extraYield":0,"cumulativeReward":0,"isDeposit":false,"expectedReward":0},{"id":0,"userId":838,"target":"活期罐","expectedTime":"2016-01-12","investAmount":0,"principal":0,"couponAmount":0,"earnings":0,"rewardAmount":0,"totalRewardAmount":0,"dreamFund":0,"status":1,"complete":false,"timestamp":"2016-01-11","investmentType":0,"yesterdayEarned":0,"totalEarnings":0,"intervalDay":1,"expirationTimeStr":"活期","mobilityStr":"随存随取","yield":8,"cycleYield":8,"rewardYield":0,"commonYield":0,"extraYield":0,"cumulativeReward":0,"isDeposit":false,"expectedReward":0},{"id":-1,"userId":838,"target":"月度罐","expectedTime":"2016-02-12","investAmount":0,"principal":0,"couponAmount":0,"earnings":0,"rewardAmount":0,"totalRewardAmount":0,"dreamFund":0,"status":1,"complete":false,"timestamp":"2016-01-11","investmentType":1,"yesterdayEarned":0,"totalEarnings":0,"intervalDay":33,"expirationTimeStr":"到期时间2016-02-12","mobilityStr":"1个月","yield":8.5,"cycleYield":8.5,"rewardYield":0,"commonYield":0,"extraYield":0,"cumulativeReward":0,"isDeposit":false,"expectedReward":0},{"id":-2,"userId":838,"target":"季度罐","expectedTime":"2016-04-12","investAmount":0,"principal":0,"couponAmount":0,"earnings":0,"rewardAmount":0,"totalRewardAmount":0,"dreamFund":0,"status":1,"complete":false,"timestamp":"2016-01-11","investmentType":2,"yesterdayEarned":0,"totalEarnings":0,"intervalDay":93,"expirationTimeStr":"到期时间2016-04-12","mobilityStr":"3个月","yield":8.8,"cycleYield":8.8,"rewardYield":0,"commonYield":0,"extraYield":0,"cumulativeReward":0,"isDeposit":false,"expectedReward":0}]},"message":"成功"},
    //"asset/getCurrentYieldLog": {"code":0,"data":[{date:"2016-03-04",yield:0.7},{date:"2016-03-05",yield:0.9}],"message":"成功"},

	_end_:0
});/**
 * Created by huyuqiong on 2017/1/6.
 */
define("utils.fileprogress", function (req,exp) {
    "use strict";
    var $ = req("jquery");

    exp.bindEvent = function (file) {
        var parseBtn = $(".ui-upload-box-parse");
        parseBtn.on("click",function () {
            if(parseBtn.attr("status") == "play"){
                parseBtn.attr("status","stop");
            }
        });
    }

    exp.countProgress = function (file,index) {
        var percentage = file.percent;

        var progressbar = $('.ui-upload-box-process-'+index).children("span");
        var progressText = $(".ui-upload-process-val-"+index);

        percentage = parseInt(percentage, 10);
        if (file.status !== plupload.DONE && percentage === 100) {
            percentage = 99;
        }

        progressbar.css('width', percentage + '%');
        progressText.text(percentage + '%');

    }
});/**
 * mOxie - multi-runtime File API & XMLHttpRequest L2 Polyfill
 * v1.2.0
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 *
 * Date: 2014-01-16
 */
/**
 * Compiled inline version. (Library mode)
 */

/*jshint smarttabs:true, undef:true, latedef:true, curly:true, bitwise:true, camelcase:true */
/*globals $code */

(function(exports, undefined) {
	"use strict";

	var modules = {};

	function require(ids, callback) {
		var module, defs = [];

		for (var i = 0; i < ids.length; ++i) {
			module = modules[ids[i]] || resolve(ids[i]);
			if (!module) {
				throw 'module definition dependecy not found: ' + ids[i];
			}

			defs.push(module);
		}

		callback.apply(null, defs);
	}

	function define(id, dependencies, definition) {
		if (typeof id !== 'string') {
			throw 'invalid module definition, module id must be defined and be a string';
		}

		if (dependencies === undefined) {
			throw 'invalid module definition, dependencies must be specified';
		}

		if (definition === undefined) {
			throw 'invalid module definition, definition function must be specified';
		}

		require(dependencies, function() {
			modules[id] = definition.apply(null, arguments);
		});
	}

	function defined(id) {
		return !!modules[id];
	}

	function resolve(id) {
		var target = exports;
		var fragments = id.split(/[.\/]/);

		for (var fi = 0; fi < fragments.length; ++fi) {
			if (!target[fragments[fi]]) {
				return;
			}

			target = target[fragments[fi]];
		}

		return target;
	}

	function expose(ids) {
		for (var i = 0; i < ids.length; i++) {
			var target = exports;
			var id = ids[i];
			var fragments = id.split(/[.\/]/);

			for (var fi = 0; fi < fragments.length - 1; ++fi) {
				if (target[fragments[fi]] === undefined) {
					target[fragments[fi]] = {};
				}

				target = target[fragments[fi]];
			}

			target[fragments[fragments.length - 1]] = modules[id];
		}
	}

// Included from: src/javascript/core/utils/Basic.js

/**
 * Basic.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/core/utils/Basic', [], function() {
	/**
	Gets the true type of the built-in object (better version of typeof).
	@author Angus Croll (http://javascriptweblog.wordpress.com/)

	@method typeOf
	@for Utils
	@static
	@param {Object} o Object to check.
	@return {String} Object [[Class]]
	*/
	var typeOf = function(o) {
		var undef;

		if (o === undef) {
			return 'undefined';
		} else if (o === null) {
			return 'null';
		} else if (o.nodeType) {
			return 'node';
		}

		// the snippet below is awesome, however it fails to detect null, undefined and arguments types in IE lte 8
		return ({}).toString.call(o).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
	};
		
	/**
	Extends the specified object with another object.

	@method extend
	@static
	@param {Object} target Object to extend.
	@param {Object} [obj]* Multiple objects to extend with.
	@return {Object} Same as target, the extended object.
	*/
	var extend = function(target) {
		var undef;

		each(arguments, function(arg, i) {
			if (i > 0) {
				each(arg, function(value, key) {
					if (value !== undef) {
						if (typeOf(target[key]) === typeOf(value) && !!~inArray(typeOf(value), ['array', 'object'])) {
							extend(target[key], value);
						} else {
							target[key] = value;
						}
					}
				});
			}
		});
		return target;
	};
		
	/**
	Executes the callback function for each item in array/object. If you return false in the
	callback it will break the loop.

	@method each
	@static
	@param {Object} obj Object to iterate.
	@param {function} callback Callback function to execute for each item.
	*/
	var each = function(obj, callback) {
		var length, key, i, undef;

		if (obj) {
			try {
				length = obj.length;
			} catch(ex) {
				length = undef;
			}

			if (length === undef) {
				// Loop object items
				for (key in obj) {
					if (obj.hasOwnProperty(key)) {
						if (callback(obj[key], key) === false) {
							return;
						}
					}
				}
			} else {
				// Loop array items
				for (i = 0; i < length; i++) {
					if (callback(obj[i], i) === false) {
						return;
					}
				}
			}
		}
	};

	/**
	Checks if object is empty.
	
	@method isEmptyObj
	@static
	@param {Object} o Object to check.
	@return {Boolean}
	*/
	var isEmptyObj = function(obj) {
		var prop;

		if (!obj || typeOf(obj) !== 'object') {
			return true;
		}

		for (prop in obj) {
			return false;
		}

		return true;
	};

	/**
	Recieve an array of functions (usually async) to call in sequence, each  function
	receives a callback as first argument that it should call, when it completes. Finally,
	after everything is complete, main callback is called. Passing truthy value to the
	callback as a first argument will interrupt the sequence and invoke main callback
	immediately.

	@method inSeries
	@static
	@param {Array} queue Array of functions to call in sequence
	@param {Function} cb Main callback that is called in the end, or in case of erro
	*/
	var inSeries = function(queue, cb) {
		var i = 0, length = queue.length;

		if (typeOf(cb) !== 'function') {
			cb = function() {};
		}

		if (!queue || !queue.length) {
			cb();
		}

		function callNext(i) {
			if (typeOf(queue[i]) === 'function') {
				queue[i](function(error) {
					/*jshint expr:true */
					++i < length && !error ? callNext(i) : cb(error);
				});
			}
		}
		callNext(i);
	};


	/**
	Recieve an array of functions (usually async) to call in parallel, each  function
	receives a callback as first argument that it should call, when it completes. After 
	everything is complete, main callback is called. Passing truthy value to the
	callback as a first argument will interrupt the process and invoke main callback
	immediately.

	@method inParallel
	@static
	@param {Array} queue Array of functions to call in sequence
	@param {Function} cb Main callback that is called in the end, or in case of erro
	*/
	var inParallel = function(queue, cb) {
		var count = 0, num = queue.length, cbArgs = new Array(num);

		each(queue, function(fn, i) {
			fn(function(error) {
				if (error) {
					return cb(error);
				}
				
				var args = [].slice.call(arguments);
				args.shift(); // strip error - undefined or not

				cbArgs[i] = args;
				count++;

				if (count === num) {
					cbArgs.unshift(null);
					cb.apply(this, cbArgs);
				} 
			});
		});
	};
	
	
	/**
	Find an element in array and return it's index if present, otherwise return -1.
	
	@method inArray
	@static
	@param {Mixed} needle Element to find
	@param {Array} array
	@return {Int} Index of the element, or -1 if not found
	*/
	var inArray = function(needle, array) {
		if (array) {
			if (Array.prototype.indexOf) {
				return Array.prototype.indexOf.call(array, needle);
			}
		
			for (var i = 0, length = array.length; i < length; i++) {
				if (array[i] === needle) {
					return i;
				}
			}
		}
		return -1;
	};


	/**
	Returns elements of first array if they are not present in second. And false - otherwise.

	@private
	@method arrayDiff
	@param {Array} needles
	@param {Array} array
	@return {Array|Boolean}
	*/
	var arrayDiff = function(needles, array) {
		var diff = [];

		if (typeOf(needles) !== 'array') {
			needles = [needles];
		}

		if (typeOf(array) !== 'array') {
			array = [array];
		}

		for (var i in needles) {
			if (inArray(needles[i], array) === -1) {
				diff.push(needles[i]);
			}	
		}
		return diff.length ? diff : false;
	};


	/**
	Find intersection of two arrays.

	@private
	@method arrayIntersect
	@param {Array} array1
	@param {Array} array2
	@return {Array} Intersection of two arrays or null if there is none
	*/
	var arrayIntersect = function(array1, array2) {
		var result = [];
		each(array1, function(item) {
			if (inArray(item, array2) !== -1) {
				result.push(item);
			}
		});
		return result.length ? result : null;
	};
	
	
	/**
	Forces anything into an array.
	
	@method toArray
	@static
	@param {Object} obj Object with length field.
	@return {Array} Array object containing all items.
	*/
	var toArray = function(obj) {
		var i, arr = [];

		for (i = 0; i < obj.length; i++) {
			arr[i] = obj[i];
		}

		return arr;
	};
	
			
	/**
	Generates an unique ID. This is 99.99% unique since it takes the current time and 5 random numbers.
	The only way a user would be able to get the same ID is if the two persons at the same exact milisecond manages
	to get 5 the same random numbers between 0-65535 it also uses a counter so each call will be guaranteed to be page unique.
	It's more probable for the earth to be hit with an ansteriod. Y
	
	@method guid
	@static
	@param {String} prefix to prepend (by default 'o' will be prepended).
	@method guid
	@return {String} Virtually unique id.
	*/
	var guid = (function() {
		var counter = 0;
		
		return function(prefix) {
			var guid = new Date().getTime().toString(32), i;

			for (i = 0; i < 5; i++) {
				guid += Math.floor(Math.random() * 65535).toString(32);
			}
			
			return (prefix || 'o_') + guid + (counter++).toString(32);
		};
	}());
	

	/**
	Trims white spaces around the string
	
	@method trim
	@static
	@param {String} str
	@return {String}
	*/
	var trim = function(str) {
		if (!str) {
			return str;
		}
		return String.prototype.trim ? String.prototype.trim.call(str) : str.toString().replace(/^\s*/, '').replace(/\s*$/, '');
	};


	/**
	Parses the specified size string into a byte value. For example 10kb becomes 10240.
	
	@method parseSizeStr
	@static
	@param {String/Number} size String to parse or number to just pass through.
	@return {Number} Size in bytes.
	*/
	var parseSizeStr = function(size) {
		if (typeof(size) !== 'string') {
			return size;
		}
		
		var muls = {
				t: 1099511627776,
				g: 1073741824,
				m: 1048576,
				k: 1024
			},
			mul;

		size = /^([0-9]+)([mgk]?)$/.exec(size.toLowerCase().replace(/[^0-9mkg]/g, ''));
		mul = size[2];
		size = +size[1];
		
		if (muls.hasOwnProperty(mul)) {
			size *= muls[mul];
		}
		return size;
	};
	

	return {
		guid: guid,
		typeOf: typeOf,
		extend: extend,
		each: each,
		isEmptyObj: isEmptyObj,
		inSeries: inSeries,
		inParallel: inParallel,
		inArray: inArray,
		arrayDiff: arrayDiff,
		arrayIntersect: arrayIntersect,
		toArray: toArray,
		trim: trim,
		parseSizeStr: parseSizeStr
	};
});

// Included from: src/javascript/core/I18n.js

/**
 * I18n.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define("moxie/core/I18n", [
	"moxie/core/utils/Basic"
], function(Basic) {
	var i18n = {};

	return {
		/**
		 * Extends the language pack object with new items.
		 *
		 * @param {Object} pack Language pack items to add.
		 * @return {Object} Extended language pack object.
		 */
		addI18n: function(pack) {
			return Basic.extend(i18n, pack);
		},

		/**
		 * Translates the specified string by checking for the english string in the language pack lookup.
		 *
		 * @param {String} str String to look for.
		 * @return {String} Translated string or the input string if it wasn't found.
		 */
		translate: function(str) {
			return i18n[str] || str;
		},

		/**
		 * Shortcut for translate function
		 *
		 * @param {String} str String to look for.
		 * @return {String} Translated string or the input string if it wasn't found.
		 */
		_: function(str) {
			return this.translate(str);
		},

		/**
		 * Pseudo sprintf implementation - simple way to replace tokens with specified values.
		 *
		 * @param {String} str String with tokens
		 * @return {String} String with replaced tokens
		 */
		sprintf: function(str) {
			var args = [].slice.call(arguments, 1);

			return str.replace(/%[a-z]/g, function() {
				var value = args.shift();
				return Basic.typeOf(value) !== 'undefined' ? value : '';
			});
		}
	};
});

// Included from: src/javascript/core/utils/Mime.js

/**
 * Mime.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define("moxie/core/utils/Mime", [
	"moxie/core/utils/Basic",
	"moxie/core/I18n"
], function(Basic, I18n) {
	
	var mimeData = "" +
		"application/msword,doc dot," +
		"application/pdf,pdf," +
		"application/pgp-signature,pgp," +
		"application/postscript,ps ai eps," +
		"application/rtf,rtf," +
		"application/vnd.ms-excel,xls xlb," +
		"application/vnd.ms-powerpoint,ppt pps pot," +
		"application/zip,zip," +
		"application/x-shockwave-flash,swf swfl," +
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document,docx," +
		"application/vnd.openxmlformats-officedocument.wordprocessingml.template,dotx," +
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,xlsx," +
		"application/vnd.openxmlformats-officedocument.presentationml.presentation,pptx," +
		"application/vnd.openxmlformats-officedocument.presentationml.template,potx," +
		"application/vnd.openxmlformats-officedocument.presentationml.slideshow,ppsx," +
		"application/x-javascript,js," +
		"application/json,json," +
		"audio/mpeg,mp3 mpga mpega mp2," +
		"audio/x-wav,wav," +
		"audio/x-m4a,m4a," +
		"audio/ogg,oga ogg," +
		"audio/aiff,aiff aif," +
		"audio/flac,flac," +
		"audio/aac,aac," +
		"audio/ac3,ac3," +
		"audio/x-ms-wma,wma," +
		"image/bmp,bmp," +
		"image/gif,gif," +
		"image/jpeg,jpg jpeg jpe," +
		"image/photoshop,psd," +
		"image/png,png," +
		"image/svg+xml,svg svgz," +
		"image/tiff,tiff tif," +
		"text/plain,asc txt text diff log," +
		"text/html,htm html xhtml," +
		"text/css,css," +
		"text/csv,csv," +
		"text/rtf,rtf," +
		"video/mpeg,mpeg mpg mpe m2v," +
		"video/quicktime,qt mov," +
		"video/mp4,mp4," +
		"video/x-m4v,m4v," +
		"video/x-flv,flv," +
		"video/x-ms-wmv,wmv," +
		"video/avi,avi," +
		"video/webm,webm," +
		"video/3gpp,3gpp 3gp," +
		"video/3gpp2,3g2," +
		"video/vnd.rn-realvideo,rv," +
		"video/ogg,ogv," + 
		"video/x-matroska,mkv," +
		"application/vnd.oasis.opendocument.formula-template,otf," +
		"application/octet-stream,exe";
	
	
	var Mime = {

		mimes: {},

		extensions: {},

		// Parses the default mime types string into a mimes and extensions lookup maps
		addMimeType: function (mimeData) {
			var items = mimeData.split(/,/), i, ii, ext;
			
			for (i = 0; i < items.length; i += 2) {
				ext = items[i + 1].split(/ /);

				// extension to mime lookup
				for (ii = 0; ii < ext.length; ii++) {
					this.mimes[ext[ii]] = items[i];
				}
				// mime to extension lookup
				this.extensions[items[i]] = ext;
			}
		},


		extList2mimes: function (filters, addMissingExtensions) {
			var self = this, ext, i, ii, type, mimes = [];
			
			// convert extensions to mime types list
			for (i = 0; i < filters.length; i++) {
				ext = filters[i].extensions.split(/\s*,\s*/);

				for (ii = 0; ii < ext.length; ii++) {
					
					// if there's an asterisk in the list, then accept attribute is not required
					if (ext[ii] === '*') {
						return [];
					}
					
					type = self.mimes[ext[ii]];
					if (!type) {
						if (addMissingExtensions && /^\w+$/.test(ext[ii])) {
							mimes.push('.' + ext[ii]);
						} else {
							return []; // accept all
						}
					} else if (Basic.inArray(type, mimes) === -1) {
						mimes.push(type);
					}
				}
			}
			return mimes;
		},


		mimes2exts: function(mimes) {
			var self = this, exts = [];
			
			Basic.each(mimes, function(mime) {
				if (mime === '*') {
					exts = [];
					return false;
				}

				// check if this thing looks like mime type
				var m = mime.match(/^(\w+)\/(\*|\w+)$/);
				if (m) {
					if (m[2] === '*') { 
						// wildcard mime type detected
						Basic.each(self.extensions, function(arr, mime) {
							if ((new RegExp('^' + m[1] + '/')).test(mime)) {
								[].push.apply(exts, self.extensions[mime]);
							}
						});
					} else if (self.extensions[mime]) {
						[].push.apply(exts, self.extensions[mime]);
					}
				}
			});
			return exts;
		},


		mimes2extList: function(mimes) {
			var accept = [], exts = [];

			if (Basic.typeOf(mimes) === 'string') {
				mimes = Basic.trim(mimes).split(/\s*,\s*/);
			}

			exts = this.mimes2exts(mimes);
			
			accept.push({
				title: I18n.translate('Files'),
				extensions: exts.length ? exts.join(',') : '*'
			});
			
			// save original mimes string
			accept.mimes = mimes;

			return accept;
		},


		getFileExtension: function(fileName) {
			var matches = fileName && fileName.match(/\.([^.]+)$/);
			if (matches) {
				return matches[1].toLowerCase();
			}
			return '';
		},

		getFileMime: function(fileName) {
			return this.mimes[this.getFileExtension(fileName)] || '';
		}
	};

	Mime.addMimeType(mimeData);

	return Mime;
});

// Included from: src/javascript/core/utils/Env.js

/**
 * Env.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define("moxie/core/utils/Env", [
	"moxie/core/utils/Basic"
], function(Basic) {
	
	// UAParser.js v0.6.2
	// Lightweight JavaScript-based User-Agent string parser
	// https://github.com/faisalman/ua-parser-js
	//
	// Copyright © 2012-2013 Faisalman <fyzlman@gmail.com>
	// Dual licensed under GPLv2 & MIT

	var UAParser = (function (undefined) {

	    //////////////
	    // Constants
	    /////////////


	    var EMPTY       = '',
	        UNKNOWN     = '?',
	        FUNC_TYPE   = 'function',
	        UNDEF_TYPE  = 'undefined',
	        OBJ_TYPE    = 'object',
	        MAJOR       = 'major',
	        MODEL       = 'model',
	        NAME        = 'name',
	        TYPE        = 'type',
	        VENDOR      = 'vendor',
	        VERSION     = 'version',
	        ARCHITECTURE= 'architecture',
	        CONSOLE     = 'console',
	        MOBILE      = 'mobile',
	        TABLET      = 'tablet';


	    ///////////
	    // Helper
	    //////////


	    var util = {
	        has : function (str1, str2) {
	            return str2.toLowerCase().indexOf(str1.toLowerCase()) !== -1;
	        },
	        lowerize : function (str) {
	            return str.toLowerCase();
	        }
	    };


	    ///////////////
	    // Map helper
	    //////////////


	    var mapper = {

	        rgx : function () {

	            // loop through all regexes maps
	            for (var result, i = 0, j, k, p, q, matches, match, args = arguments; i < args.length; i += 2) {

	                var regex = args[i],       // even sequence (0,2,4,..)
	                    props = args[i + 1];   // odd sequence (1,3,5,..)

	                // construct object barebones
	                if (typeof(result) === UNDEF_TYPE) {
	                    result = {};
	                    for (p in props) {
	                        q = props[p];
	                        if (typeof(q) === OBJ_TYPE) {
	                            result[q[0]] = undefined;
	                        } else {
	                            result[q] = undefined;
	                        }
	                    }
	                }

	                // try matching uastring with regexes
	                for (j = k = 0; j < regex.length; j++) {
	                    matches = regex[j].exec(this.getUA());
	                    if (!!matches) {
	                        for (p = 0; p < props.length; p++) {
	                            match = matches[++k];
	                            q = props[p];
	                            // check if given property is actually array
	                            if (typeof(q) === OBJ_TYPE && q.length > 0) {
	                                if (q.length == 2) {
	                                    if (typeof(q[1]) == FUNC_TYPE) {
	                                        // assign modified match
	                                        result[q[0]] = q[1].call(this, match);
	                                    } else {
	                                        // assign given value, ignore regex match
	                                        result[q[0]] = q[1];
	                                    }
	                                } else if (q.length == 3) {
	                                    // check whether function or regex
	                                    if (typeof(q[1]) === FUNC_TYPE && !(q[1].exec && q[1].test)) {
	                                        // call function (usually string mapper)
	                                        result[q[0]] = match ? q[1].call(this, match, q[2]) : undefined;
	                                    } else {
	                                        // sanitize match using given regex
	                                        result[q[0]] = match ? match.replace(q[1], q[2]) : undefined;
	                                    }
	                                } else if (q.length == 4) {
	                                        result[q[0]] = match ? q[3].call(this, match.replace(q[1], q[2])) : undefined;
	                                }
	                            } else {
	                                result[q] = match ? match : undefined;
	                            }
	                        }
	                        break;
	                    }
	                }

	                if(!!matches) break; // break the loop immediately if match found
	            }
	            return result;
	        },

	        str : function (str, map) {

	            for (var i in map) {
	                // check if array
	                if (typeof(map[i]) === OBJ_TYPE && map[i].length > 0) {
	                    for (var j = 0; j < map[i].length; j++) {
	                        if (util.has(map[i][j], str)) {
	                            return (i === UNKNOWN) ? undefined : i;
	                        }
	                    }
	                } else if (util.has(map[i], str)) {
	                    return (i === UNKNOWN) ? undefined : i;
	                }
	            }
	            return str;
	        }
	    };


	    ///////////////
	    // String map
	    //////////////


	    var maps = {

	        browser : {
	            oldsafari : {
	                major : {
	                    '1' : ['/8', '/1', '/3'],
	                    '2' : '/4',
	                    '?' : '/'
	                },
	                version : {
	                    '1.0'   : '/8',
	                    '1.2'   : '/1',
	                    '1.3'   : '/3',
	                    '2.0'   : '/412',
	                    '2.0.2' : '/416',
	                    '2.0.3' : '/417',
	                    '2.0.4' : '/419',
	                    '?'     : '/'
	                }
	            }
	        },

	        device : {
	            sprint : {
	                model : {
	                    'Evo Shift 4G' : '7373KT'
	                },
	                vendor : {
	                    'HTC'       : 'APA',
	                    'Sprint'    : 'Sprint'
	                }
	            }
	        },

	        os : {
	            windows : {
	                version : {
	                    'ME'        : '4.90',
	                    'NT 3.11'   : 'NT3.51',
	                    'NT 4.0'    : 'NT4.0',
	                    '2000'      : 'NT 5.0',
	                    'XP'        : ['NT 5.1', 'NT 5.2'],
	                    'Vista'     : 'NT 6.0',
	                    '7'         : 'NT 6.1',
	                    '8'         : 'NT 6.2',
	                    '8.1'       : 'NT 6.3',
	                    'RT'        : 'ARM'
	                }
	            }
	        }
	    };


	    //////////////
	    // Regex map
	    /////////////


	    var regexes = {

	        browser : [[

	            // Presto based
	            /(opera\smini)\/((\d+)?[\w\.-]+)/i,                                 // Opera Mini
	            /(opera\s[mobiletab]+).+version\/((\d+)?[\w\.-]+)/i,                // Opera Mobi/Tablet
	            /(opera).+version\/((\d+)?[\w\.]+)/i,                               // Opera > 9.80
	            /(opera)[\/\s]+((\d+)?[\w\.]+)/i                                    // Opera < 9.80
	            
	            ], [NAME, VERSION, MAJOR], [

	            /\s(opr)\/((\d+)?[\w\.]+)/i                                         // Opera Webkit
	            ], [[NAME, 'Opera'], VERSION, MAJOR], [

	            // Mixed
	            /(kindle)\/((\d+)?[\w\.]+)/i,                                       // Kindle
	            /(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?((\d+)?[\w\.]+)*/i,
	                                                                                // Lunascape/Maxthon/Netfront/Jasmine/Blazer

	            // Trident based
	            /(avant\s|iemobile|slim|baidu)(?:browser)?[\/\s]?((\d+)?[\w\.]*)/i,
	                                                                                // Avant/IEMobile/SlimBrowser/Baidu
	            /(?:ms|\()(ie)\s((\d+)?[\w\.]+)/i,                                  // Internet Explorer

	            // Webkit/KHTML based
	            /(rekonq)((?:\/)[\w\.]+)*/i,                                        // Rekonq
	            /(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron)\/((\d+)?[\w\.-]+)/i
	                                                                                // Chromium/Flock/RockMelt/Midori/Epiphany/Silk/Skyfire/Bolt/Iron
	            ], [NAME, VERSION, MAJOR], [

	            /(trident).+rv[:\s]((\d+)?[\w\.]+).+like\sgecko/i                   // IE11
	            ], [[NAME, 'IE'], VERSION, MAJOR], [

	            /(yabrowser)\/((\d+)?[\w\.]+)/i                                     // Yandex
	            ], [[NAME, 'Yandex'], VERSION, MAJOR], [

	            /(comodo_dragon)\/((\d+)?[\w\.]+)/i                                 // Comodo Dragon
	            ], [[NAME, /_/g, ' '], VERSION, MAJOR], [

	            /(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?((\d+)?[\w\.]+)/i
	                                                                                // Chrome/OmniWeb/Arora/Tizen/Nokia
	            ], [NAME, VERSION, MAJOR], [

	            /(dolfin)\/((\d+)?[\w\.]+)/i                                        // Dolphin
	            ], [[NAME, 'Dolphin'], VERSION, MAJOR], [

	            /((?:android.+)crmo|crios)\/((\d+)?[\w\.]+)/i                       // Chrome for Android/iOS
	            ], [[NAME, 'Chrome'], VERSION, MAJOR], [

	            /((?:android.+))version\/((\d+)?[\w\.]+)\smobile\ssafari/i          // Android Browser
	            ], [[NAME, 'Android Browser'], VERSION, MAJOR], [

	            /version\/((\d+)?[\w\.]+).+?mobile\/\w+\s(safari)/i                 // Mobile Safari
	            ], [VERSION, MAJOR, [NAME, 'Mobile Safari']], [

	            /version\/((\d+)?[\w\.]+).+?(mobile\s?safari|safari)/i              // Safari & Safari Mobile
	            ], [VERSION, MAJOR, NAME], [

	            /webkit.+?(mobile\s?safari|safari)((\/[\w\.]+))/i                   // Safari < 3.0
	            ], [NAME, [MAJOR, mapper.str, maps.browser.oldsafari.major], [VERSION, mapper.str, maps.browser.oldsafari.version]], [

	            /(konqueror)\/((\d+)?[\w\.]+)/i,                                    // Konqueror
	            /(webkit|khtml)\/((\d+)?[\w\.]+)/i
	            ], [NAME, VERSION, MAJOR], [

	            // Gecko based
	            /(navigator|netscape)\/((\d+)?[\w\.-]+)/i                           // Netscape
	            ], [[NAME, 'Netscape'], VERSION, MAJOR], [
	            /(swiftfox)/i,                                                      // Swiftfox
	            /(icedragon|iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?((\d+)?[\w\.\+]+)/i,
	                                                                                // IceDragon/Iceweasel/Camino/Chimera/Fennec/Maemo/Minimo/Conkeror
	            /(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix)\/((\d+)?[\w\.-]+)/i,
	                                                                                // Firefox/SeaMonkey/K-Meleon/IceCat/IceApe/Firebird/Phoenix
	            /(mozilla)\/((\d+)?[\w\.]+).+rv\:.+gecko\/\d+/i,                    // Mozilla

	            // Other
	            /(uc\s?browser|polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|qqbrowser)[\/\s]?((\d+)?[\w\.]+)/i,
	                                                                                // UCBrowser/Polaris/Lynx/Dillo/iCab/Doris/Amaya/w3m/NetSurf/QQBrowser
	            /(links)\s\(((\d+)?[\w\.]+)/i,                                      // Links
	            /(gobrowser)\/?((\d+)?[\w\.]+)*/i,                                  // GoBrowser
	            /(ice\s?browser)\/v?((\d+)?[\w\._]+)/i,                             // ICE Browser
	            /(mosaic)[\/\s]((\d+)?[\w\.]+)/i                                    // Mosaic
	            ], [NAME, VERSION, MAJOR]
	        ],

	        engine : [[

	            /(presto)\/([\w\.]+)/i,                                             // Presto
	            /(webkit|trident|netfront|netsurf|amaya|lynx|w3m)\/([\w\.]+)/i,     // WebKit/Trident/NetFront/NetSurf/Amaya/Lynx/w3m
	            /(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,                          // KHTML/Tasman/Links
	            /(icab)[\/\s]([23]\.[\d\.]+)/i                                      // iCab
	            ], [NAME, VERSION], [

	            /rv\:([\w\.]+).*(gecko)/i                                           // Gecko
	            ], [VERSION, NAME]
	        ],

	        os : [[

	            // Windows based
	            /(windows)\snt\s6\.2;\s(arm)/i,                                     // Windows RT
	            /(windows\sphone(?:\sos)*|windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i
	            ], [NAME, [VERSION, mapper.str, maps.os.windows.version]], [
	            /(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i
	            ], [[NAME, 'Windows'], [VERSION, mapper.str, maps.os.windows.version]], [

	            // Mobile/Embedded OS
	            /\((bb)(10);/i                                                      // BlackBerry 10
	            ], [[NAME, 'BlackBerry'], VERSION], [
	            /(blackberry)\w*\/?([\w\.]+)*/i,                                    // Blackberry
	            /(tizen)\/([\w\.]+)/i,                                              // Tizen
	            /(android|webos|palm\os|qnx|bada|rim\stablet\sos|meego)[\/\s-]?([\w\.]+)*/i
	                                                                                // Android/WebOS/Palm/QNX/Bada/RIM/MeeGo
	            ], [NAME, VERSION], [
	            /(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]+)*/i                 // Symbian
	            ], [[NAME, 'Symbian'], VERSION],[
	            /mozilla.+\(mobile;.+gecko.+firefox/i                               // Firefox OS
	            ], [[NAME, 'Firefox OS'], VERSION], [

	            // Console
	            /(nintendo|playstation)\s([wids3portablevu]+)/i,                    // Nintendo/Playstation

	            // GNU/Linux based
	            /(mint)[\/\s\(]?(\w+)*/i,                                           // Mint
	            /(joli|[kxln]?ubuntu|debian|[open]*suse|gentoo|arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk)[\/\s-]?([\w\.-]+)*/i,
	                                                                                // Joli/Ubuntu/Debian/SUSE/Gentoo/Arch/Slackware
	                                                                                // Fedora/Mandriva/CentOS/PCLinuxOS/RedHat/Zenwalk
	            /(hurd|linux)\s?([\w\.]+)*/i,                                       // Hurd/Linux
	            /(gnu)\s?([\w\.]+)*/i                                               // GNU
	            ], [NAME, VERSION], [

	            /(cros)\s[\w]+\s([\w\.]+\w)/i                                       // Chromium OS
	            ], [[NAME, 'Chromium OS'], VERSION],[

	            // Solaris
	            /(sunos)\s?([\w\.]+\d)*/i                                           // Solaris
	            ], [[NAME, 'Solaris'], VERSION], [

	            // BSD based
	            /\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]+)*/i                   // FreeBSD/NetBSD/OpenBSD/PC-BSD/DragonFly
	            ], [NAME, VERSION],[

	            /(ip[honead]+)(?:.*os\s*([\w]+)*\slike\smac|;\sopera)/i             // iOS
	            ], [[NAME, 'iOS'], [VERSION, /_/g, '.']], [

	            /(mac\sos\sx)\s?([\w\s\.]+\w)*/i                                    // Mac OS
	            ], [NAME, [VERSION, /_/g, '.']], [

	            // Other
	            /(haiku)\s(\w+)/i,                                                  // Haiku
	            /(aix)\s((\d)(?=\.|\)|\s)[\w\.]*)*/i,                               // AIX
	            /(macintosh|mac(?=_powerpc)|plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos)/i,
	                                                                                // Plan9/Minix/BeOS/OS2/AmigaOS/MorphOS/RISCOS
	            /(unix)\s?([\w\.]+)*/i                                              // UNIX
	            ], [NAME, VERSION]
	        ]
	    };


	    /////////////////
	    // Constructor
	    ////////////////


	    var UAParser = function (uastring) {

	        var ua = uastring || ((window && window.navigator && window.navigator.userAgent) ? window.navigator.userAgent : EMPTY);

	        this.getBrowser = function () {
	            return mapper.rgx.apply(this, regexes.browser);
	        };
	        this.getEngine = function () {
	            return mapper.rgx.apply(this, regexes.engine);
	        };
	        this.getOS = function () {
	            return mapper.rgx.apply(this, regexes.os);
	        };
	        this.getResult = function() {
	            return {
	                ua      : this.getUA(),
	                browser : this.getBrowser(),
	                engine  : this.getEngine(),
	                os      : this.getOS()
	            };
	        };
	        this.getUA = function () {
	            return ua;
	        };
	        this.setUA = function (uastring) {
	            ua = uastring;
	            return this;
	        };
	        this.setUA(ua);
	    };

	    return new UAParser().getResult();
	})();


	function version_compare(v1, v2, operator) {
	  // From: http://phpjs.org/functions
	  // +      original by: Philippe Jausions (http://pear.php.net/user/jausions)
	  // +      original by: Aidan Lister (http://aidanlister.com/)
	  // + reimplemented by: Kankrelune (http://www.webfaktory.info/)
	  // +      improved by: Brett Zamir (http://brett-zamir.me)
	  // +      improved by: Scott Baker
	  // +      improved by: Theriault
	  // *        example 1: version_compare('8.2.5rc', '8.2.5a');
	  // *        returns 1: 1
	  // *        example 2: version_compare('8.2.50', '8.2.52', '<');
	  // *        returns 2: true
	  // *        example 3: version_compare('5.3.0-dev', '5.3.0');
	  // *        returns 3: -1
	  // *        example 4: version_compare('4.1.0.52','4.01.0.51');
	  // *        returns 4: 1

	  // Important: compare must be initialized at 0.
	  var i = 0,
	    x = 0,
	    compare = 0,
	    // vm maps textual PHP versions to negatives so they're less than 0.
	    // PHP currently defines these as CASE-SENSITIVE. It is important to
	    // leave these as negatives so that they can come before numerical versions
	    // and as if no letters were there to begin with.
	    // (1alpha is < 1 and < 1.1 but > 1dev1)
	    // If a non-numerical value can't be mapped to this table, it receives
	    // -7 as its value.
	    vm = {
	      'dev': -6,
	      'alpha': -5,
	      'a': -5,
	      'beta': -4,
	      'b': -4,
	      'RC': -3,
	      'rc': -3,
	      '#': -2,
	      'p': 1,
	      'pl': 1
	    },
	    // This function will be called to prepare each version argument.
	    // It replaces every _, -, and + with a dot.
	    // It surrounds any nonsequence of numbers/dots with dots.
	    // It replaces sequences of dots with a single dot.
	    //    version_compare('4..0', '4.0') == 0
	    // Important: A string of 0 length needs to be converted into a value
	    // even less than an unexisting value in vm (-7), hence [-8].
	    // It's also important to not strip spaces because of this.
	    //   version_compare('', ' ') == 1
	    prepVersion = function (v) {
	      v = ('' + v).replace(/[_\-+]/g, '.');
	      v = v.replace(/([^.\d]+)/g, '.$1.').replace(/\.{2,}/g, '.');
	      return (!v.length ? [-8] : v.split('.'));
	    },
	    // This converts a version component to a number.
	    // Empty component becomes 0.
	    // Non-numerical component becomes a negative number.
	    // Numerical component becomes itself as an integer.
	    numVersion = function (v) {
	      return !v ? 0 : (isNaN(v) ? vm[v] || -7 : parseInt(v, 10));
	    };

	  v1 = prepVersion(v1);
	  v2 = prepVersion(v2);
	  x = Math.max(v1.length, v2.length);
	  for (i = 0; i < x; i++) {
	    if (v1[i] == v2[i]) {
	      continue;
	    }
	    v1[i] = numVersion(v1[i]);
	    v2[i] = numVersion(v2[i]);
	    if (v1[i] < v2[i]) {
	      compare = -1;
	      break;
	    } else if (v1[i] > v2[i]) {
	      compare = 1;
	      break;
	    }
	  }
	  if (!operator) {
	    return compare;
	  }

	  // Important: operator is CASE-SENSITIVE.
	  // "No operator" seems to be treated as "<."
	  // Any other values seem to make the function return null.
	  switch (operator) {
	  case '>':
	  case 'gt':
	    return (compare > 0);
	  case '>=':
	  case 'ge':
	    return (compare >= 0);
	  case '<=':
	  case 'le':
	    return (compare <= 0);
	  case '==':
	  case '=':
	  case 'eq':
	    return (compare === 0);
	  case '<>':
	  case '!=':
	  case 'ne':
	    return (compare !== 0);
	  case '':
	  case '<':
	  case 'lt':
	    return (compare < 0);
	  default:
	    return null;
	  }
	}


	var can = (function() {
		var caps = {
				define_property: (function() {
					/* // currently too much extra code required, not exactly worth it
					try { // as of IE8, getters/setters are supported only on DOM elements
						var obj = {};
						if (Object.defineProperty) {
							Object.defineProperty(obj, 'prop', {
								enumerable: true,
								configurable: true
							});
							return true;
						}
					} catch(ex) {}

					if (Object.prototype.__defineGetter__ && Object.prototype.__defineSetter__) {
						return true;
					}*/
					return false;
				}()),

				create_canvas: (function() {
					// On the S60 and BB Storm, getContext exists, but always returns undefined
					// so we actually have to call getContext() to verify
					// github.com/Modernizr/Modernizr/issues/issue/97/
					var el = document.createElement('canvas');
					return !!(el.getContext && el.getContext('2d'));
				}()),

				return_response_type: function(responseType) {
					try {
						if (Basic.inArray(responseType, ['', 'text', 'document']) !== -1) {
							return true;
						} else if (window.XMLHttpRequest) {
							var xhr = new XMLHttpRequest();
							xhr.open('get', '/'); // otherwise Gecko throws an exception
							if ('responseType' in xhr) {
								xhr.responseType = responseType;
								// as of 23.0.1271.64, Chrome switched from throwing exception to merely logging it to the console (why? o why?)
								if (xhr.responseType !== responseType) {
									return false;
								}
								return true;
							}
						}
					} catch (ex) {}
					return false;
				},

				// ideas for this heavily come from Modernizr (http://modernizr.com/)
				use_data_uri: (function() {
					var du = new Image();

					du.onload = function() {
						caps.use_data_uri = (du.width === 1 && du.height === 1);
					};
					
					setTimeout(function() {
						du.src = "data:image/gif;base64,R0lGODlhAQABAIAAAP8AAAAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";
					}, 1);
					return false;
				}()),

				use_data_uri_over32kb: function() { // IE8
					return caps.use_data_uri && (Env.browser !== 'IE' || Env.version >= 9);
				},

				use_data_uri_of: function(bytes) {
					return (caps.use_data_uri && bytes < 33000 || caps.use_data_uri_over32kb());
				},

				use_fileinput: function() {
					var el = document.createElement('input');
					el.setAttribute('type', 'file');
					return !el.disabled;
				}
			};

		return function(cap) {
			var args = [].slice.call(arguments);
			args.shift(); // shift of cap
			return Basic.typeOf(caps[cap]) === 'function' ? caps[cap].apply(this, args) : !!caps[cap];
		};
	}());


	var Env = {
		can: can,
		
		browser: UAParser.browser.name,
		version: parseFloat(UAParser.browser.major),
		os: UAParser.os.name, // everybody intuitively types it in a lowercase for some reason
		osVersion: UAParser.os.version,

		verComp: version_compare,
		
		swf_url: "../flash/Moxie.swf",
		xap_url: "../silverlight/Moxie.xap",
		global_event_dispatcher: "moxie.core.EventTarget.instance.dispatchEvent"
	};

	// for backward compatibility
	// @deprecated Use `Env.os` instead
	Env.OS = Env.os;

	return Env;
});

// Included from: src/javascript/core/utils/Dom.js

/**
 * Dom.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/core/utils/Dom', ['moxie/core/utils/Env'], function(Env) {

	/**
	Get DOM Element by it's id.

	@method get
	@for Utils
	@param {String} id Identifier of the DOM Element
	@return {DOMElement}
	*/
	var get = function(id) {
		if (typeof id !== 'string') {
			return id;
		}
		return document.getElementById(id);
	};

	/**
	Checks if specified DOM element has specified class.

	@method hasClass
	@static
	@param {Object} obj DOM element like object to add handler to.
	@param {String} name Class name
	*/
	var hasClass = function(obj, name) {
		if (!obj.className) {
			return false;
		}

		var regExp = new RegExp("(^|\\s+)"+name+"(\\s+|$)");
		return regExp.test(obj.className);
	};

	/**
	Adds specified className to specified DOM element.

	@method addClass
	@static
	@param {Object} obj DOM element like object to add handler to.
	@param {String} name Class name
	*/
	var addClass = function(obj, name) {
		if (!hasClass(obj, name)) {
			obj.className = !obj.className ? name : obj.className.replace(/\s+$/, '') + ' ' + name;
		}
	};

	/**
	Removes specified className from specified DOM element.

	@method removeClass
	@static
	@param {Object} obj DOM element like object to add handler to.
	@param {String} name Class name
	*/
	var removeClass = function(obj, name) {
		if (obj.className) {
			var regExp = new RegExp("(^|\\s+)"+name+"(\\s+|$)");
			obj.className = obj.className.replace(regExp, function($0, $1, $2) {
				return $1 === ' ' && $2 === ' ' ? ' ' : '';
			});
		}
	};

	/**
	Returns a given computed style of a DOM element.

	@method getStyle
	@static
	@param {Object} obj DOM element like object.
	@param {String} name Style you want to get from the DOM element
	*/
	var getStyle = function(obj, name) {
		if (obj.currentStyle) {
			return obj.currentStyle[name];
		} else if (window.getComputedStyle) {
			return window.getComputedStyle(obj, null)[name];
		}
	};


	/**
	Returns the absolute x, y position of an Element. The position will be returned in a object with x, y fields.

	@method getPos
	@static
	@param {Element} node HTML element or element id to get x, y position from.
	@param {Element} root Optional root element to stop calculations at.
	@return {object} Absolute position of the specified element object with x, y fields.
	*/
	var getPos = function(node, root) {
		var x = 0, y = 0, parent, doc = document, nodeRect, rootRect;

		node = node;
		root = root || doc.body;

		// Returns the x, y cordinate for an element on IE 6 and IE 7
		function getIEPos(node) {
			var bodyElm, rect, x = 0, y = 0;

			if (node) {
				rect = node.getBoundingClientRect();
				bodyElm = doc.compatMode === "CSS1Compat" ? doc.documentElement : doc.body;
				x = rect.left + bodyElm.scrollLeft;
				y = rect.top + bodyElm.scrollTop;
			}

			return {
				x : x,
				y : y
			};
		}

		// Use getBoundingClientRect on IE 6 and IE 7 but not on IE 8 in standards mode
		if (node && node.getBoundingClientRect && Env.browser === 'IE' && (!doc.documentMode || doc.documentMode < 8)) {
			nodeRect = getIEPos(node);
			rootRect = getIEPos(root);

			return {
				x : nodeRect.x - rootRect.x,
				y : nodeRect.y - rootRect.y
			};
		}

		parent = node;
		while (parent && parent != root && parent.nodeType) {
			x += parent.offsetLeft || 0;
			y += parent.offsetTop || 0;
			parent = parent.offsetParent;
		}

		parent = node.parentNode;
		while (parent && parent != root && parent.nodeType) {
			x -= parent.scrollLeft || 0;
			y -= parent.scrollTop || 0;
			parent = parent.parentNode;
		}

		return {
			x : x,
			y : y
		};
	};

	/**
	Returns the size of the specified node in pixels.

	@method getSize
	@static
	@param {Node} node Node to get the size of.
	@return {Object} Object with a w and h property.
	*/
	var getSize = function(node) {
		return {
			w : node.offsetWidth || node.clientWidth,
			h : node.offsetHeight || node.clientHeight
		};
	};

	return {
		get: get,
		hasClass: hasClass,
		addClass: addClass,
		removeClass: removeClass,
		getStyle: getStyle,
		getPos: getPos,
		getSize: getSize
	};
});

// Included from: src/javascript/core/Exceptions.js

/**
 * Exceptions.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/core/Exceptions', [
	'moxie/core/utils/Basic'
], function(Basic) {
	function _findKey(obj, value) {
		var key;
		for (key in obj) {
			if (obj[key] === value) {
				return key;
			}
		}
		return null;
	}

	return {
		RuntimeError: (function() {
			var namecodes = {
				NOT_INIT_ERR: 1,
				NOT_SUPPORTED_ERR: 9,
				JS_ERR: 4
			};

			function RuntimeError(code) {
				this.code = code;
				this.name = _findKey(namecodes, code);
				this.message = this.name + ": RuntimeError " + this.code;
			}
			
			Basic.extend(RuntimeError, namecodes);
			RuntimeError.prototype = Error.prototype;
			return RuntimeError;
		}()),
		
		OperationNotAllowedException: (function() {
			
			function OperationNotAllowedException(code) {
				this.code = code;
				this.name = 'OperationNotAllowedException';
			}
			
			Basic.extend(OperationNotAllowedException, {
				NOT_ALLOWED_ERR: 1
			});
			
			OperationNotAllowedException.prototype = Error.prototype;
			
			return OperationNotAllowedException;
		}()),

		ImageError: (function() {
			var namecodes = {
				WRONG_FORMAT: 1,
				MAX_RESOLUTION_ERR: 2
			};

			function ImageError(code) {
				this.code = code;
				this.name = _findKey(namecodes, code);
				this.message = this.name + ": ImageError " + this.code;
			}
			
			Basic.extend(ImageError, namecodes);
			ImageError.prototype = Error.prototype;

			return ImageError;
		}()),

		FileException: (function() {
			var namecodes = {
				NOT_FOUND_ERR: 1,
				SECURITY_ERR: 2,
				ABORT_ERR: 3,
				NOT_READABLE_ERR: 4,
				ENCODING_ERR: 5,
				NO_MODIFICATION_ALLOWED_ERR: 6,
				INVALID_STATE_ERR: 7,
				SYNTAX_ERR: 8
			};

			function FileException(code) {
				this.code = code;
				this.name = _findKey(namecodes, code);
				this.message = this.name + ": FileException " + this.code;
			}
			
			Basic.extend(FileException, namecodes);
			FileException.prototype = Error.prototype;
			return FileException;
		}()),
		
		DOMException: (function() {
			var namecodes = {
				INDEX_SIZE_ERR: 1,
				DOMSTRING_SIZE_ERR: 2,
				HIERARCHY_REQUEST_ERR: 3,
				WRONG_DOCUMENT_ERR: 4,
				INVALID_CHARACTER_ERR: 5,
				NO_DATA_ALLOWED_ERR: 6,
				NO_MODIFICATION_ALLOWED_ERR: 7,
				NOT_FOUND_ERR: 8,
				NOT_SUPPORTED_ERR: 9,
				INUSE_ATTRIBUTE_ERR: 10,
				INVALID_STATE_ERR: 11,
				SYNTAX_ERR: 12,
				INVALID_MODIFICATION_ERR: 13,
				NAMESPACE_ERR: 14,
				INVALID_ACCESS_ERR: 15,
				VALIDATION_ERR: 16,
				TYPE_MISMATCH_ERR: 17,
				SECURITY_ERR: 18,
				NETWORK_ERR: 19,
				ABORT_ERR: 20,
				URL_MISMATCH_ERR: 21,
				QUOTA_EXCEEDED_ERR: 22,
				TIMEOUT_ERR: 23,
				INVALID_NODE_TYPE_ERR: 24,
				DATA_CLONE_ERR: 25
			};

			function DOMException(code) {
				this.code = code;
				this.name = _findKey(namecodes, code);
				this.message = this.name + ": DOMException " + this.code;
			}
			
			Basic.extend(DOMException, namecodes);
			DOMException.prototype = Error.prototype;
			return DOMException;
		}()),
		
		EventException: (function() {
			function EventException(code) {
				this.code = code;
				this.name = 'EventException';
			}
			
			Basic.extend(EventException, {
				UNSPECIFIED_EVENT_TYPE_ERR: 0
			});
			
			EventException.prototype = Error.prototype;
			
			return EventException;
		}())
	};
});

// Included from: src/javascript/core/EventTarget.js

/**
 * EventTarget.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/core/EventTarget', [
	'moxie/core/Exceptions',
	'moxie/core/utils/Basic'
], function(x, Basic) {
	/**
	Parent object for all event dispatching components and objects

	@class EventTarget
	@constructor EventTarget
	*/
	function EventTarget() {
		// hash of event listeners by object uid
		var eventpool = {};
				
		Basic.extend(this, {
			
			/**
			Unique id of the event dispatcher, usually overriden by children

			@property uid
			@type String
			*/
			uid: null,
			
			/**
			Can be called from within a child  in order to acquire uniqie id in automated manner

			@method init
			*/
			init: function() {
				if (!this.uid) {
					this.uid = Basic.guid('uid_');
				}
			},

			/**
			Register a handler to a specific event dispatched by the object

			@method addEventListener
			@param {String} type Type or basically a name of the event to subscribe to
			@param {Function} fn Callback function that will be called when event happens
			@param {Number} [priority=0] Priority of the event handler - handlers with higher priorities will be called first
			@param {Object} [scope=this] A scope to invoke event handler in
			*/
			addEventListener: function(type, fn, priority, scope) {
				var self = this, list;
				
				type = Basic.trim(type);
				
				if (/\s/.test(type)) {
					// multiple event types were passed for one handler
					Basic.each(type.split(/\s+/), function(type) {
						self.addEventListener(type, fn, priority, scope);
					});
					return;
				}
				
				type = type.toLowerCase();
				priority = parseInt(priority, 10) || 0;
				
				list = eventpool[this.uid] && eventpool[this.uid][type] || [];
				list.push({fn : fn, priority : priority, scope : scope || this});
				
				if (!eventpool[this.uid]) {
					eventpool[this.uid] = {};
				}
				eventpool[this.uid][type] = list;
			},
			
			/**
			Check if any handlers were registered to the specified event

			@method hasEventListener
			@param {String} type Type or basically a name of the event to check
			@return {Mixed} Returns a handler if it was found and false, if - not
			*/
			hasEventListener: function(type) {
				return type ? !!(eventpool[this.uid] && eventpool[this.uid][type]) : !!eventpool[this.uid];
			},
			
			/**
			Unregister the handler from the event, or if former was not specified - unregister all handlers

			@method removeEventListener
			@param {String} type Type or basically a name of the event
			@param {Function} [fn] Handler to unregister
			*/
			removeEventListener: function(type, fn) {
				type = type.toLowerCase();
	
				var list = eventpool[this.uid] && eventpool[this.uid][type], i;
	
				if (list) {
					if (fn) {
						for (i = list.length - 1; i >= 0; i--) {
							if (list[i].fn === fn) {
								list.splice(i, 1);
								break;
							}
						}
					} else {
						list = [];
					}
	
					// delete event list if it has become empty
					if (!list.length) {
						delete eventpool[this.uid][type];
						
						// and object specific entry in a hash if it has no more listeners attached
						if (Basic.isEmptyObj(eventpool[this.uid])) {
							delete eventpool[this.uid];
						}
					}
				}
			},
			
			/**
			Remove all event handlers from the object

			@method removeAllEventListeners
			*/
			removeAllEventListeners: function() {
				if (eventpool[this.uid]) {
					delete eventpool[this.uid];
				}
			},
			
			/**
			Dispatch the event

			@method dispatchEvent
			@param {String/Object} Type of event or event object to dispatch
			@param {Mixed} [...] Variable number of arguments to be passed to a handlers
			@return {Boolean} true by default and false if any handler returned false
			*/
			dispatchEvent: function(type) {
				var uid, list, args, tmpEvt, evt = {}, result = true, undef;
				
				if (Basic.typeOf(type) !== 'string') {
					// we can't use original object directly (because of Silverlight)
					tmpEvt = type;

					if (Basic.typeOf(tmpEvt.type) === 'string') {
						type = tmpEvt.type;

						if (tmpEvt.total !== undef && tmpEvt.loaded !== undef) { // progress event
							evt.total = tmpEvt.total;
							evt.loaded = tmpEvt.loaded;
						}
						evt.async = tmpEvt.async || false;
					} else {
						throw new x.EventException(x.EventException.UNSPECIFIED_EVENT_TYPE_ERR);
					}
				}
				
				// check if event is meant to be dispatched on an object having specific uid
				if (type.indexOf('::') !== -1) {
					(function(arr) {
						uid = arr[0];
						type = arr[1];
					}(type.split('::')));
				} else {
					uid = this.uid;
				}
				
				type = type.toLowerCase();
								
				list = eventpool[uid] && eventpool[uid][type];

				if (list) {
					// sort event list by prority
					list.sort(function(a, b) { return b.priority - a.priority; });
					
					args = [].slice.call(arguments);
					
					// first argument will be pseudo-event object
					args.shift();
					evt.type = type;
					args.unshift(evt);

					// Dispatch event to all listeners
					var queue = [];
					Basic.each(list, function(handler) {
						// explicitly set the target, otherwise events fired from shims do not get it
						args[0].target = handler.scope;
						// if event is marked as async, detach the handler
						if (evt.async) {
							queue.push(function(cb) {
								setTimeout(function() {
									cb(handler.fn.apply(handler.scope, args) === false);
								}, 1);
							});
						} else {
							queue.push(function(cb) {
								cb(handler.fn.apply(handler.scope, args) === false); // if handler returns false stop propagation
							});
						}
					});
					if (queue.length) {
						Basic.inSeries(queue, function(err) {
							result = !err;
						});
					}
				}
				return result;
			},
			
			/**
			Alias for addEventListener

			@method bind
			@protected
			*/
			bind: function() {
				this.addEventListener.apply(this, arguments);
			},
			
			/**
			Alias for removeEventListener

			@method unbind
			@protected
			*/
			unbind: function() {
				this.removeEventListener.apply(this, arguments);
			},
			
			/**
			Alias for removeAllEventListeners

			@method unbindAll
			@protected
			*/
			unbindAll: function() {
				this.removeAllEventListeners.apply(this, arguments);
			},
			
			/**
			Alias for dispatchEvent

			@method trigger
			@protected
			*/
			trigger: function() {
				return this.dispatchEvent.apply(this, arguments);
			},
			
			
			/**
			Converts properties of on[event] type to corresponding event handlers,
			is used to avoid extra hassle around the process of calling them back

			@method convertEventPropsToHandlers
			@private
			*/
			convertEventPropsToHandlers: function(handlers) {
				var h;
						
				if (Basic.typeOf(handlers) !== 'array') {
					handlers = [handlers];
				}

				for (var i = 0; i < handlers.length; i++) {
					h = 'on' + handlers[i];
					
					if (Basic.typeOf(this[h]) === 'function') {
						this.addEventListener(handlers[i], this[h]);
					} else if (Basic.typeOf(this[h]) === 'undefined') {
						this[h] = null; // object must have defined event properties, even if it doesn't make use of them
					}
				}
			}
			
		});
	}

	EventTarget.instance = new EventTarget(); 

	return EventTarget;
});

// Included from: src/javascript/core/utils/Encode.js

/**
 * Encode.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/core/utils/Encode', [], function() {

	/**
	Encode string with UTF-8

	@method utf8_encode
	@for Utils
	@static
	@param {String} str String to encode
	@return {String} UTF-8 encoded string
	*/
	var utf8_encode = function(str) {
		return unescape(encodeURIComponent(str));
	};
	
	/**
	Decode UTF-8 encoded string

	@method utf8_decode
	@static
	@param {String} str String to decode
	@return {String} Decoded string
	*/
	var utf8_decode = function(str_data) {
		return decodeURIComponent(escape(str_data));
	};
	
	/**
	Decode Base64 encoded string (uses browser's default method if available),
	from: https://raw.github.com/kvz/phpjs/master/functions/url/base64_decode.js

	@method atob
	@static
	@param {String} data String to decode
	@return {String} Decoded string
	*/
	var atob = function(data, utf8) {
		if (typeof(window.atob) === 'function') {
			return utf8 ? utf8_decode(window.atob(data)) : window.atob(data);
		}

		// http://kevin.vanzonneveld.net
		// +   original by: Tyler Akins (http://rumkin.com)
		// +   improved by: Thunder.m
		// +      input by: Aman Gupta
		// +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +   bugfixed by: Onno Marsman
		// +   bugfixed by: Pellentesque Malesuada
		// +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +      input by: Brett Zamir (http://brett-zamir.me)
		// +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// *     example 1: base64_decode('S2V2aW4gdmFuIFpvbm5ldmVsZA==');
		// *     returns 1: 'Kevin van Zonneveld'
		// mozilla has this native
		// - but breaks in 2.0.0.12!
		//if (typeof this.window.atob == 'function') {
		//    return atob(data);
		//}
		var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
			ac = 0,
			dec = "",
			tmp_arr = [];

		if (!data) {
			return data;
		}

		data += '';

		do { // unpack four hexets into three octets using index points in b64
			h1 = b64.indexOf(data.charAt(i++));
			h2 = b64.indexOf(data.charAt(i++));
			h3 = b64.indexOf(data.charAt(i++));
			h4 = b64.indexOf(data.charAt(i++));

			bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

			o1 = bits >> 16 & 0xff;
			o2 = bits >> 8 & 0xff;
			o3 = bits & 0xff;

			if (h3 == 64) {
				tmp_arr[ac++] = String.fromCharCode(o1);
			} else if (h4 == 64) {
				tmp_arr[ac++] = String.fromCharCode(o1, o2);
			} else {
				tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
			}
		} while (i < data.length);

		dec = tmp_arr.join('');

		return utf8 ? utf8_decode(dec) : dec;
	};
	
	/**
	Base64 encode string (uses browser's default method if available),
	from: https://raw.github.com/kvz/phpjs/master/functions/url/base64_encode.js

	@method btoa
	@static
	@param {String} data String to encode
	@return {String} Base64 encoded string
	*/
	var btoa = function(data, utf8) {
		if (utf8) {
			utf8_encode(data);
		}

		if (typeof(window.btoa) === 'function') {
			return window.btoa(data);
		}

		// http://kevin.vanzonneveld.net
		// +   original by: Tyler Akins (http://rumkin.com)
		// +   improved by: Bayron Guevara
		// +   improved by: Thunder.m
		// +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +   bugfixed by: Pellentesque Malesuada
		// +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +   improved by: Rafał Kukawski (http://kukawski.pl)
		// *     example 1: base64_encode('Kevin van Zonneveld');
		// *     returns 1: 'S2V2aW4gdmFuIFpvbm5ldmVsZA=='
		// mozilla has this native
		// - but breaks in 2.0.0.12!
		var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
			ac = 0,
			enc = "",
			tmp_arr = [];

		if (!data) {
			return data;
		}

		do { // pack three octets into four hexets
			o1 = data.charCodeAt(i++);
			o2 = data.charCodeAt(i++);
			o3 = data.charCodeAt(i++);

			bits = o1 << 16 | o2 << 8 | o3;

			h1 = bits >> 18 & 0x3f;
			h2 = bits >> 12 & 0x3f;
			h3 = bits >> 6 & 0x3f;
			h4 = bits & 0x3f;

			// use hexets to index into b64, and append result to encoded string
			tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
		} while (i < data.length);

		enc = tmp_arr.join('');

		var r = data.length % 3;

		return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);
	};


	return {
		utf8_encode: utf8_encode,
		utf8_decode: utf8_decode,
		atob: atob,
		btoa: btoa
	};
});

// Included from: src/javascript/runtime/Runtime.js

/**
 * Runtime.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/runtime/Runtime', [
	"moxie/core/utils/Basic",
	"moxie/core/utils/Dom",
	"moxie/core/EventTarget"
], function(Basic, Dom, EventTarget) {
	var runtimeConstructors = {}, runtimes = {};

	/**
	Common set of methods and properties for every runtime instance

	@class Runtime

	@param {Object} options
	@param {String} type Sanitized name of the runtime
	@param {Object} [caps] Set of capabilities that differentiate specified runtime
	@param {Object} [modeCaps] Set of capabilities that do require specific operational mode
	@param {String} [preferredMode='browser'] Preferred operational mode to choose if no required capabilities were requested
	*/
	function Runtime(options, type, caps, modeCaps, preferredMode) {
		/**
		Dispatched when runtime is initialized and ready.
		Results in RuntimeInit on a connected component.

		@event Init
		*/

		/**
		Dispatched when runtime fails to initialize.
		Results in RuntimeError on a connected component.

		@event Error
		*/

		var self = this
		, _shim
		, _uid = Basic.guid(type + '_')
		, defaultMode = preferredMode || 'browser'
		;

		options = options || {};

		// register runtime in private hash
		runtimes[_uid] = this;

		/**
		Default set of capabilities, which can be redifined later by specific runtime

		@private
		@property caps
		@type Object
		*/
		caps = Basic.extend({
			// Runtime can: 
			// provide access to raw binary data of the file
			access_binary: false,
			// provide access to raw binary data of the image (image extension is optional) 
			access_image_binary: false,
			// display binary data as thumbs for example
			display_media: false,
			// make cross-domain requests
			do_cors: false,
			// accept files dragged and dropped from the desktop
			drag_and_drop: false,
			// filter files in selection dialog by their extensions
			filter_by_extension: true,
			// resize image (and manipulate it raw data of any file in general)
			resize_image: false,
			// periodically report how many bytes of total in the file were uploaded (loaded)
			report_upload_progress: false,
			// provide access to the headers of http response 
			return_response_headers: false,
			// support response of specific type, which should be passed as an argument
			// e.g. runtime.can('return_response_type', 'blob')
			return_response_type: false,
			// return http status code of the response
			return_status_code: true,
			// send custom http header with the request
			send_custom_headers: false,
			// pick up the files from a dialog
			select_file: false,
			// select whole folder in file browse dialog
			select_folder: false,
			// select multiple files at once in file browse dialog
			select_multiple: true,
			// send raw binary data, that is generated after image resizing or manipulation of other kind
			send_binary_string: false,
			// send cookies with http request and therefore retain session
			send_browser_cookies: true,
			// send data formatted as multipart/form-data
			send_multipart: true,
			// slice the file or blob to smaller parts
			slice_blob: false,
			// upload file without preloading it to memory, stream it out directly from disk
			stream_upload: false,
			// programmatically trigger file browse dialog
			summon_file_dialog: false,
			// upload file of specific size, size should be passed as argument
			// e.g. runtime.can('upload_filesize', '500mb')
			upload_filesize: true,
			// initiate http request with specific http method, method should be passed as argument
			// e.g. runtime.can('use_http_method', 'put')
			use_http_method: true
		}, caps);
			
	
		// default to the mode that is compatible with preferred caps
		if (options.preferred_caps) {
			defaultMode = Runtime.getMode(modeCaps, options.preferred_caps, defaultMode);
		}
		
		// small extension factory here (is meant to be extended with actual extensions constructors)
		_shim = (function() {
			var objpool = {};
			return {
				exec: function(uid, comp, fn, args) {
					if (_shim[comp]) {
						if (!objpool[uid]) {
							objpool[uid] = {
								context: this,
								instance: new _shim[comp]()
							};
						}
						if (objpool[uid].instance[fn]) {
							return objpool[uid].instance[fn].apply(this, args);
						}
					}
				},

				removeInstance: function(uid) {
					delete objpool[uid];
				},

				removeAllInstances: function() {
					var self = this;
					Basic.each(objpool, function(obj, uid) {
						if (Basic.typeOf(obj.instance.destroy) === 'function') {
							obj.instance.destroy.call(obj.context);
						}
						self.removeInstance(uid);
					});
				}
			};
		}());


		// public methods
		Basic.extend(this, {
			/**
			Specifies whether runtime instance was initialized or not

			@property initialized
			@type {Boolean}
			@default false
			*/
			initialized: false, // shims require this flag to stop initialization retries

			/**
			Unique ID of the runtime

			@property uid
			@type {String}
			*/
			uid: _uid,

			/**
			Runtime type (e.g. flash, html5, etc)

			@property type
			@type {String}
			*/
			type: type,

			/**
			Runtime (not native one) may operate in browser or client mode.

			@property mode
			@private
			@type {String|Boolean} current mode or false, if none possible
			*/
			mode: Runtime.getMode(modeCaps, (options.required_caps), defaultMode),

			/**
			id of the DOM container for the runtime (if available)

			@property shimid
			@type {String}
			*/
			shimid: _uid + '_container',

			/**
			Number of connected clients. If equal to zero, runtime can be destroyed

			@property clients
			@type {Number}
			*/
			clients: 0,

			/**
			Runtime initialization options

			@property options
			@type {Object}
			*/
			options: options,

			/**
			Checks if the runtime has specific capability

			@method can
			@param {String} cap Name of capability to check
			@param {Mixed} [value] If passed, capability should somehow correlate to the value
			@param {Object} [refCaps] Set of capabilities to check the specified cap against (defaults to internal set)
			@return {Boolean} true if runtime has such capability and false, if - not
			*/
			can: function(cap, value) {
				var refCaps = arguments[2] || caps;

				// if cap var is a comma-separated list of caps, convert it to object (key/value)
				if (Basic.typeOf(cap) === 'string' && Basic.typeOf(value) === 'undefined') {
					cap = Runtime.parseCaps(cap);
				}

				if (Basic.typeOf(cap) === 'object') {
					for (var key in cap) {
						if (!this.can(key, cap[key], refCaps)) {
							return false;
						}
					}
					return true;
				}

				// check the individual cap
				if (Basic.typeOf(refCaps[cap]) === 'function') {
					return refCaps[cap].call(this, value);
				} else {
					return (value === refCaps[cap]);
				}
			},

			/**
			Returns container for the runtime as DOM element

			@method getShimContainer
			@return {DOMElement}
			*/
			getShimContainer: function() {
				var container, shimContainer = Dom.get(this.shimid);

				// if no container for shim, create one
				if (!shimContainer) {
					container = this.options.container ? Dom.get(this.options.container) : document.body;

					// create shim container and insert it at an absolute position into the outer container
					shimContainer = document.createElement('div');
					shimContainer.id = this.shimid;
					shimContainer.className = 'moxie-shim moxie-shim-' + this.type;

					Basic.extend(shimContainer.style, {
						position: 'absolute',
						top: '0px',
						left: '0px',
						width: '1px',
						height: '1px',
						overflow: 'hidden'
					});

					container.appendChild(shimContainer);
					container = null;
				}

				return shimContainer;
			},

			/**
			Returns runtime as DOM element (if appropriate)

			@method getShim
			@return {DOMElement}
			*/
			getShim: function() {
				return _shim;
			},

			/**
			Invokes a method within the runtime itself (might differ across the runtimes)

			@method shimExec
			@param {Mixed} []
			@protected
			@return {Mixed} Depends on the action and component
			*/
			shimExec: function(component, action) {
				var args = [].slice.call(arguments, 2);
				return self.getShim().exec.call(this, this.uid, component, action, args);
			},

			/**
			Operaional interface that is used by components to invoke specific actions on the runtime
			(is invoked in the scope of component)

			@method exec
			@param {Mixed} []*
			@protected
			@return {Mixed} Depends on the action and component
			*/
			exec: function(component, action) { // this is called in the context of component, not runtime
				var args = [].slice.call(arguments, 2);

				if (self[component] && self[component][action]) {
					return self[component][action].apply(this, args);
				}
				return self.shimExec.apply(this, arguments);
			},

			/**
			Destroys the runtime (removes all events and deletes DOM structures)

			@method destroy
			*/
			destroy: function() {
				if (!self) {
					return; // obviously already destroyed
				}

				var shimContainer = Dom.get(this.shimid);
				if (shimContainer) {
					shimContainer.parentNode.removeChild(shimContainer);
				}

				if (_shim) {
					_shim.removeAllInstances();
				}

				this.unbindAll();
				delete runtimes[this.uid];
				this.uid = null; // mark this runtime as destroyed
				_uid = self = _shim = shimContainer = null;
			}
		});

		// once we got the mode, test against all caps
		if (this.mode && options.required_caps && !this.can(options.required_caps)) {
			this.mode = false;
		}	
	}


	/**
	Default order to try different runtime types

	@property order
	@type String
	@static
	*/
	Runtime.order = 'html5,flash,silverlight,html4';


	/**
	Retrieves runtime from private hash by it's uid

	@method getRuntime
	@private
	@static
	@param {String} uid Unique identifier of the runtime
	@return {Runtime|Boolean} Returns runtime, if it exists and false, if - not
	*/
	Runtime.getRuntime = function(uid) {
		return runtimes[uid] ? runtimes[uid] : false;
	};


	/**
	Register constructor for the Runtime of new (or perhaps modified) type

	@method addConstructor
	@static
	@param {String} type Runtime type (e.g. flash, html5, etc)
	@param {Function} construct Constructor for the Runtime type
	*/
	Runtime.addConstructor = function(type, constructor) {
		constructor.prototype = EventTarget.instance;
		runtimeConstructors[type] = constructor;
	};


	/**
	Get the constructor for the specified type.

	method getConstructor
	@static
	@param {String} type Runtime type (e.g. flash, html5, etc)
	@return {Function} Constructor for the Runtime type
	*/
	Runtime.getConstructor = function(type) {
		return runtimeConstructors[type] || null;
	};


	/**
	Get info about the runtime (uid, type, capabilities)

	@method getInfo
	@static
	@param {String} uid Unique identifier of the runtime
	@return {Mixed} Info object or null if runtime doesn't exist
	*/
	Runtime.getInfo = function(uid) {
		var runtime = Runtime.getRuntime(uid);

		if (runtime) {
			return {
				uid: runtime.uid,
				type: runtime.type,
				mode: runtime.mode,
				can: function() {
					return runtime.can.apply(runtime, arguments);
				}
			};
		}
		return null;
	};


	/**
	Convert caps represented by a comma-separated string to the object representation.

	@method parseCaps
	@static
	@param {String} capStr Comma-separated list of capabilities
	@return {Object}
	*/
	Runtime.parseCaps = function(capStr) {
		var capObj = {};

		if (Basic.typeOf(capStr) !== 'string') {
			return capStr || {};
		}

		Basic.each(capStr.split(','), function(key) {
			capObj[key] = true; // we assume it to be - true
		});

		return capObj;
	};

	/**
	Test the specified runtime for specific capabilities.

	@method can
	@static
	@param {String} type Runtime type (e.g. flash, html5, etc)
	@param {String|Object} caps Set of capabilities to check
	@return {Boolean} Result of the test
	*/
	Runtime.can = function(type, caps) {
		var runtime
		, constructor = Runtime.getConstructor(type)
		, mode
		;
		if (constructor) {
			runtime = new constructor({
				required_caps: caps
			});
			mode = runtime.mode;
			runtime.destroy();
			return !!mode;
		}
		return false;
	};


	/**
	Figure out a runtime that supports specified capabilities.

	@method thatCan
	@static
	@param {String|Object} caps Set of capabilities to check
	@param {String} [runtimeOrder] Comma-separated list of runtimes to check against
	@return {String} Usable runtime identifier or null
	*/
	Runtime.thatCan = function(caps, runtimeOrder) {
		var types = (runtimeOrder || Runtime.order).split(/\s*,\s*/);
		for (var i in types) {
			if (Runtime.can(types[i], caps)) {
				return types[i];
			}
		}
		return null;
	};


	/**
	Figure out an operational mode for the specified set of capabilities.

	@method getMode
	@static
	@param {Object} modeCaps Set of capabilities that depend on particular runtime mode
	@param {Object} [requiredCaps] Supplied set of capabilities to find operational mode for
	@param {String|Boolean} [defaultMode='browser'] Default mode to use 
	@return {String|Boolean} Compatible operational mode
	*/
	Runtime.getMode = function(modeCaps, requiredCaps, defaultMode) {
		var mode = null;

		if (Basic.typeOf(defaultMode) === 'undefined') { // only if not specified
			defaultMode = 'browser';
		}

		if (requiredCaps && !Basic.isEmptyObj(modeCaps)) {
			// loop over required caps and check if they do require the same mode
			Basic.each(requiredCaps, function(value, cap) {
				if (modeCaps.hasOwnProperty(cap)) {
					var capMode = modeCaps[cap](value);

					// make sure we always have an array
					if (typeof(capMode) === 'string') {
						capMode = [capMode];
					}
					
					if (!mode) {
						mode = capMode;
					} else if (!(mode = Basic.arrayIntersect(mode, capMode))) {
						// if cap requires conflicting mode - runtime cannot fulfill required caps
						return (mode = false);
					}
				}
			});

			if (mode) {
				return Basic.inArray(defaultMode, mode) !== -1 ? defaultMode : mode[0];
			} else if (mode === false) {
				return false;
			}
		}
		return defaultMode; 
	};


	/**
	Capability check that always returns true

	@private
	@static
	@return {True}
	*/
	Runtime.capTrue = function() {
		return true;
	};

	/**
	Capability check that always returns false

	@private
	@static
	@return {False}
	*/
	Runtime.capFalse = function() {
		return false;
	};

	/**
	Evaluate the expression to boolean value and create a function that always returns it.

	@private
	@static
	@param {Mixed} expr Expression to evaluate
	@return {Function} Function returning the result of evaluation
	*/
	Runtime.capTest = function(expr) {
		return function() {
			return !!expr;
		};
	};

	return Runtime;
});

// Included from: src/javascript/runtime/RuntimeClient.js

/**
 * RuntimeClient.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/runtime/RuntimeClient', [
	'moxie/core/Exceptions',
	'moxie/core/utils/Basic',
	'moxie/runtime/Runtime'
], function(x, Basic, Runtime) {
	/**
	Set of methods and properties, required by a component to acquire ability to connect to a runtime

	@class RuntimeClient
	*/
	return function RuntimeClient() {
		var runtime;

		Basic.extend(this, {
			/**
			Connects to the runtime specified by the options. Will either connect to existing runtime or create a new one.
			Increments number of clients connected to the specified runtime.

			@method connectRuntime
			@param {Mixed} options Can be a runtme uid or a set of key-value pairs defining requirements and pre-requisites
			*/
			connectRuntime: function(options) {
				var comp = this, ruid;

				function initialize(items) {
					var type, constructor;

					// if we ran out of runtimes
					if (!items.length) {
						comp.trigger('RuntimeError', new x.RuntimeError(x.RuntimeError.NOT_INIT_ERR));
						runtime = null;
						return;
					}

					type = items.shift();
					constructor = Runtime.getConstructor(type);
					if (!constructor) {
						initialize(items);
						return;
					}

					// try initializing the runtime
					runtime = new constructor(options);

					runtime.bind('Init', function() {
						// mark runtime as initialized
						runtime.initialized = true;

						// jailbreak ...
						setTimeout(function() {
							runtime.clients++;
							// this will be triggered on component
							comp.trigger('RuntimeInit', runtime);
						}, 1);
					});

					runtime.bind('Error', function() {
						runtime.destroy(); // runtime cannot destroy itself from inside at a right moment, thus we do it here
						initialize(items);
					});

					/*runtime.bind('Exception', function() { });*/

					// check if runtime managed to pick-up operational mode
					if (!runtime.mode) {
						runtime.trigger('Error');
						return;
					}

					runtime.init();
				}

				// check if a particular runtime was requested
				if (Basic.typeOf(options) === 'string') {
					ruid = options;
				} else if (Basic.typeOf(options.ruid) === 'string') {
					ruid = options.ruid;
				}

				if (ruid) {
					runtime = Runtime.getRuntime(ruid);
					if (runtime) {
						runtime.clients++;
						return runtime;
					} else {
						// there should be a runtime and there's none - weird case
						throw new x.RuntimeError(x.RuntimeError.NOT_INIT_ERR);
					}
				}

				// initialize a fresh one, that fits runtime list and required features best
				initialize((options.runtime_order || Runtime.order).split(/\s*,\s*/));
			},

			/**
			Returns the runtime to which the client is currently connected.

			@method getRuntime
			@return {Runtime} Runtime or null if client is not connected
			*/
			getRuntime: function() {
				if (runtime && runtime.uid) {
					return runtime;
				}
				runtime = null; // make sure we do not leave zombies rambling around
				return null;
			},

			/**
			Disconnects from the runtime. Decrements number of clients connected to the specified runtime.

			@method disconnectRuntime
			*/
			disconnectRuntime: function() {
				if (runtime && --runtime.clients <= 0) {
					runtime.destroy();
					runtime = null;
				}
			}

		});
	};


});

// Included from: src/javascript/file/Blob.js

/**
 * Blob.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/file/Blob', [
	'moxie/core/utils/Basic',
	'moxie/core/utils/Encode',
	'moxie/runtime/RuntimeClient'
], function(Basic, Encode, RuntimeClient) {
	
	var blobpool = {};

	/**
	@class Blob
	@constructor
	@param {String} ruid Unique id of the runtime, to which this blob belongs to
	@param {Object} blob Object "Native" blob object, as it is represented in the runtime
	*/
	function Blob(ruid, blob) {

		function _sliceDetached(start, end, type) {
			var blob, data = blobpool[this.uid];

			if (Basic.typeOf(data) !== 'string' || !data.length) {
				return null; // or throw exception
			}

			blob = new Blob(null, {
				type: type,
				size: end - start
			});
			blob.detach(data.substr(start, blob.size));

			return blob;
		}

		RuntimeClient.call(this);

		if (ruid) {	
			this.connectRuntime(ruid);
		}

		if (!blob) {
			blob = {};
		} else if (Basic.typeOf(blob) === 'string') { // dataUrl or binary string
			blob = { data: blob };
		}

		Basic.extend(this, {
			
			/**
			Unique id of the component

			@property uid
			@type {String}
			*/
			uid: blob.uid || Basic.guid('uid_'),
			
			/**
			Unique id of the connected runtime, if falsy, then runtime will have to be initialized 
			before this Blob can be used, modified or sent

			@property ruid
			@type {String}
			*/
			ruid: ruid,
	
			/**
			Size of blob

			@property size
			@type {Number}
			@default 0
			*/
			size: blob.size || 0,
			
			/**
			Mime type of blob

			@property type
			@type {String}
			@default ''
			*/
			type: blob.type || '',
			
			/**
			@method slice
			@param {Number} [start=0]
			*/
			slice: function(start, end, type) {		
				if (this.isDetached()) {
					return _sliceDetached.apply(this, arguments);
				}
				return this.getRuntime().exec.call(this, 'Blob', 'slice', this.getSource(), start, end, type);
			},

			/**
			Returns "native" blob object (as it is represented in connected runtime) or null if not found

			@method getSource
			@return {Blob} Returns "native" blob object or null if not found
			*/
			getSource: function() {
				if (!blobpool[this.uid]) {
					return null;	
				}
				return blobpool[this.uid];
			},

			/** 
			Detaches blob from any runtime that it depends on and initialize with standalone value

			@method detach
			@protected
			@param {DOMString} [data=''] Standalone value
			*/
			detach: function(data) {
				if (this.ruid) {
					this.getRuntime().exec.call(this, 'Blob', 'destroy', blobpool[this.uid]);
					this.disconnectRuntime();
					this.ruid = null;
				}

				data = data || '';

				// if dataUrl, convert to binary string
				var matches = data.match(/^data:([^;]*);base64,/);
				if (matches) {
					this.type = matches[1];
					data = Encode.atob(data.substring(data.indexOf('base64,') + 7));
				}

				this.size = data.length;

				blobpool[this.uid] = data;
			},

			/**
			Checks if blob is standalone (detached of any runtime)
			
			@method isDetached
			@protected
			@return {Boolean}
			*/
			isDetached: function() {
				return !this.ruid && Basic.typeOf(blobpool[this.uid]) === 'string';
			},
			
			/** 
			Destroy Blob and free any resources it was using

			@method destroy
			*/
			destroy: function() {
				this.detach();
				delete blobpool[this.uid];
			}
		});

		
		if (blob.data) {
			this.detach(blob.data); // auto-detach if payload has been passed
		} else {
			blobpool[this.uid] = blob;	
		}
	}
	
	return Blob;
});

// Included from: src/javascript/file/File.js

/**
 * File.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/file/File', [
	'moxie/core/utils/Basic',
	'moxie/core/utils/Mime',
	'moxie/file/Blob'
], function(Basic, Mime, Blob) {
	/**
	@class File
	@extends Blob
	@constructor
	@param {String} ruid Unique id of the runtime, to which this blob belongs to
	@param {Object} file Object "Native" file object, as it is represented in the runtime
	*/
	function File(ruid, file) {
		var name, type;

		if (!file) { // avoid extra errors in case we overlooked something
			file = {};
		}

		// figure out the type
		if (file.type && file.type !== '') {
			type = file.type;
		} else {
			type = Mime.getFileMime(file.name);
		}

		// sanitize file name or generate new one
		if (file.name) {
			name = file.name.replace(/\\/g, '/');
			name = name.substr(name.lastIndexOf('/') + 1);
		} else {
			var prefix = type.split('/')[0];
			name = Basic.guid((prefix !== '' ? prefix : 'file') + '_');
			
			if (Mime.extensions[type]) {
				name += '.' + Mime.extensions[type][0]; // append proper extension if possible
			}
		}

		Blob.apply(this, arguments);
		
		Basic.extend(this, {
			/**
			File mime type

			@property type
			@type {String}
			@default ''
			*/
			type: type || '',

			/**
			File name

			@property name
			@type {String}
			@default UID
			*/
			name: name || Basic.guid('file_'),
			
			/**
			Date of last modification

			@property lastModifiedDate
			@type {String}
			@default now
			*/
			lastModifiedDate: file.lastModifiedDate || (new Date()).toLocaleString() // Thu Aug 23 2012 19:40:00 GMT+0400 (GET)
		});
	}

	File.prototype = Blob.prototype;

	return File;
});

// Included from: src/javascript/file/FileInput.js

/**
 * FileInput.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/file/FileInput', [
	'moxie/core/utils/Basic',
	'moxie/core/utils/Mime',
	'moxie/core/utils/Dom',
	'moxie/core/Exceptions',
	'moxie/core/EventTarget',
	'moxie/core/I18n',
	'moxie/file/File',
	'moxie/runtime/Runtime',
	'moxie/runtime/RuntimeClient'
], function(Basic, Mime, Dom, x, EventTarget, I18n, File, Runtime, RuntimeClient) {
	/**
	Provides a convenient way to create cross-browser file-picker. Generates file selection dialog on click,
	converts selected files to _File_ objects, to be used in conjunction with _Image_, preloaded in memory
	with _FileReader_ or uploaded to a server through _XMLHttpRequest_.

	@class FileInput
	@constructor
	@extends EventTarget
	@uses RuntimeClient
	@param {Object|String|DOMElement} options If options is string or node, argument is considered as _browse\_button_.
		@param {String|DOMElement} options.browse_button DOM Element to turn into file picker.
		@param {Array} [options.accept] Array of mime types to accept. By default accepts all.
		@param {String} [options.file='file'] Name of the file field (not the filename).
		@param {Boolean} [options.multiple=false] Enable selection of multiple files.
		@param {Boolean} [options.directory=false] Turn file input into the folder input (cannot be both at the same time).
		@param {String|DOMElement} [options.container] DOM Element to use as a container for file-picker. Defaults to parentNode 
		for _browse\_button_.
		@param {Object|String} [options.required_caps] Set of required capabilities, that chosen runtime must support.

	@example
		<div id="container">
			<a id="file-picker" href="javascript:;">Browse...</a>
		</div>

		<script>
			var fileInput = new mOxie.FileInput({
				browse_button: 'file-picker', // or document.getElementById('file-picker')
				container: 'container',
				accept: [
					{title: "Image files", extensions: "jpg,gif,png"} // accept only images
				],
				multiple: true // allow multiple file selection
			});

			fileInput.onchange = function(e) {
				// do something to files array
				console.info(e.target.files); // or this.files or fileInput.files
			};

			fileInput.init(); // initialize
		</script>
	*/
	var dispatches = [
		/**
		Dispatched when runtime is connected and file-picker is ready to be used.

		@event ready
		@param {Object} event
		*/
		'ready',

		/**
		Dispatched right after [ready](#event_ready) event, and whenever [refresh()](#method_refresh) is invoked. 
		Check [corresponding documentation entry](#method_refresh) for more info.

		@event refresh
		@param {Object} event
		*/

		/**
		Dispatched when selection of files in the dialog is complete.

		@event change
		@param {Object} event
		*/
		'change',

		'cancel', // TODO: might be useful

		/**
		Dispatched when mouse cursor enters file-picker area. Can be used to style element
		accordingly.

		@event mouseenter
		@param {Object} event
		*/
		'mouseenter',

		/**
		Dispatched when mouse cursor leaves file-picker area. Can be used to style element
		accordingly.

		@event mouseleave
		@param {Object} event
		*/
		'mouseleave',

		/**
		Dispatched when functional mouse button is pressed on top of file-picker area.

		@event mousedown
		@param {Object} event
		*/
		'mousedown',

		/**
		Dispatched when functional mouse button is released on top of file-picker area.

		@event mouseup
		@param {Object} event
		*/
		'mouseup'
	];

	function FileInput(options) {
		var self = this,
			container, browseButton, defaults;

		// if flat argument passed it should be browse_button id
		if (Basic.inArray(Basic.typeOf(options), ['string', 'node']) !== -1) {
			options = { browse_button : options };
		}

		// this will help us to find proper default container
		browseButton = Dom.get(options.browse_button);
		if (!browseButton) {
			// browse button is required
			throw new x.DOMException(x.DOMException.NOT_FOUND_ERR);
		}

		// figure out the options
		defaults = {
			accept: [{
				title: I18n.translate('All Files'),
				extensions: '*'
			}],
			name: 'file',
			multiple: false,
			required_caps: false,
			container: browseButton.parentNode || document.body
		};
		
		options = Basic.extend({}, defaults, options);

		// convert to object representation
		if (typeof(options.required_caps) === 'string') {
			options.required_caps = Runtime.parseCaps(options.required_caps);
		}
					
		// normalize accept option (could be list of mime types or array of title/extensions pairs)
		if (typeof(options.accept) === 'string') {
			options.accept = Mime.mimes2extList(options.accept);
		}

		container = Dom.get(options.container);
		// make sure we have container
		if (!container) {
			container = document.body;
		}

		// make container relative, if it's not
		if (Dom.getStyle(container, 'position') === 'static') {
			container.style.position = 'relative';
		}

		container = browseButton = null; // IE
						
		RuntimeClient.call(self);
		
		Basic.extend(self, {
			/**
			Unique id of the component

			@property uid
			@protected
			@readOnly
			@type {String}
			@default UID
			*/
			uid: Basic.guid('uid_'),
			
			/**
			Unique id of the connected runtime, if any.

			@property ruid
			@protected
			@type {String}
			*/
			ruid: null,

			/**
			Unique id of the runtime container. Useful to get hold of it for various manipulations.

			@property shimid
			@protected
			@type {String}
			*/
			shimid: null,
			
			/**
			Array of selected mOxie.File objects

			@property files
			@type {Array}
			@default null
			*/
			files: null,

			/**
			Initializes the file-picker, connects it to runtime and dispatches event ready when done.

			@method init
			*/
			init: function() {
				self.convertEventPropsToHandlers(dispatches);

				self.bind('RuntimeInit', function(e, runtime) {
					self.ruid = runtime.uid;
					self.shimid = runtime.shimid;

					self.bind("Ready", function() {
						self.trigger("Refresh");
					}, 999);

					self.bind("Change", function() {
						var files = runtime.exec.call(self, 'FileInput', 'getFiles');

						self.files = [];

						Basic.each(files, function(file) {
							// ignore empty files (IE10 for example hangs if you try to send them via XHR)
							if (file.size === 0) {
								return true; 
							}
							self.files.push(new File(self.ruid, file));
						});
					}, 999);

					// re-position and resize shim container
					self.bind('Refresh', function() {
						var pos, size, browseButton, shimContainer;
						
						browseButton = Dom.get(options.browse_button);
						shimContainer = Dom.get(runtime.shimid); // do not use runtime.getShimContainer(), since it will create container if it doesn't exist

						if (browseButton) {
							pos = Dom.getPos(browseButton, Dom.get(options.container));
							size = Dom.getSize(browseButton);

							if (shimContainer) {
								Basic.extend(shimContainer.style, {
									top     : pos.y + 'px',
									left    : pos.x + 'px',
									width   : size.w + 'px',
									height  : size.h + 'px'
								});
							}
						}
						shimContainer = browseButton = null;
					});
					
					runtime.exec.call(self, 'FileInput', 'init', options);
				});

				// runtime needs: options.required_features, options.runtime_order and options.container
				self.connectRuntime(Basic.extend({}, options, {
					required_caps: {
						select_file: true
					}
				}));
			},

			/**
			Disables file-picker element, so that it doesn't react to mouse clicks.

			@method disable
			@param {Boolean} [state=true] Disable component if - true, enable if - false
			*/
			disable: function(state) {
				var runtime = this.getRuntime();
				if (runtime) {
					runtime.exec.call(this, 'FileInput', 'disable', Basic.typeOf(state) === 'undefined' ? true : state);
				}
			},


			/**
			Reposition and resize dialog trigger to match the position and size of browse_button element.

			@method refresh
			*/
			refresh: function() {
				self.trigger("Refresh");
			},


			/**
			Destroy component.

			@method destroy
			*/
			destroy: function() {
				var runtime = this.getRuntime();
				if (runtime) {
					runtime.exec.call(this, 'FileInput', 'destroy');
					this.disconnectRuntime();
				}

				if (Basic.typeOf(this.files) === 'array') {
					// no sense in leaving associated files behind
					Basic.each(this.files, function(file) {
						file.destroy();
					});
				} 
				this.files = null;
			}
		});
	}

	FileInput.prototype = EventTarget.instance;

	return FileInput;
});

// Included from: src/javascript/file/FileDrop.js

/**
 * FileDrop.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/file/FileDrop', [
	'moxie/core/I18n',
	'moxie/core/utils/Dom',
	'moxie/core/Exceptions',
	'moxie/core/utils/Basic',
	'moxie/file/File',
	'moxie/runtime/RuntimeClient',
	'moxie/core/EventTarget',
	'moxie/core/utils/Mime'
], function(I18n, Dom, x, Basic, File, RuntimeClient, EventTarget, Mime) {
	/**
	Turn arbitrary DOM element to a drop zone accepting files. Converts selected files to _File_ objects, to be used 
	in conjunction with _Image_, preloaded in memory with _FileReader_ or uploaded to a server through 
	_XMLHttpRequest_.

	@example
		<div id="drop_zone">
			Drop files here
		</div>
		<br />
		<div id="filelist"></div>

		<script type="text/javascript">
			var fileDrop = new mOxie.FileDrop('drop_zone'), fileList = mOxie.get('filelist');

			fileDrop.ondrop = function() {
				mOxie.each(this.files, function(file) {
					fileList.innerHTML += '<div>' + file.name + '</div>';
				});
			};

			fileDrop.init();
		</script>

	@class FileDrop
	@constructor
	@extends EventTarget
	@uses RuntimeClient
	@param {Object|String} options If options has typeof string, argument is considered as options.drop_zone
		@param {String|DOMElement} options.drop_zone DOM Element to turn into a drop zone
		@param {Array} [options.accept] Array of mime types to accept. By default accepts all
		@param {Object|String} [options.required_caps] Set of required capabilities, that chosen runtime must support
	*/
	var dispatches = [
		/**
		Dispatched when runtime is connected and drop zone is ready to accept files.

		@event ready
		@param {Object} event
		*/
		'ready', 

		/**
		Dispatched when dragging cursor enters the drop zone.

		@event dragenter
		@param {Object} event
		*/
		'dragenter',

		/**
		Dispatched when dragging cursor leaves the drop zone.

		@event dragleave
		@param {Object} event
		*/
		'dragleave', 

		/**
		Dispatched when file is dropped onto the drop zone.

		@event drop
		@param {Object} event
		*/
		'drop', 

		/**
		Dispatched if error occurs.

		@event error
		@param {Object} event
		*/
		'error'
	];

	function FileDrop(options) {
		var self = this, defaults;

		// if flat argument passed it should be drop_zone id
		if (typeof(options) === 'string') {
			options = { drop_zone : options };
		}

		// figure out the options
		defaults = {
			accept: [{
				title: I18n.translate('All Files'),
				extensions: '*'
			}],
			required_caps: {
				drag_and_drop: true
			}
		};
		
		options = typeof(options) === 'object' ? Basic.extend({}, defaults, options) : defaults;

		// this will help us to find proper default container
		options.container = Dom.get(options.drop_zone) || document.body;

		// make container relative, if it is not
		if (Dom.getStyle(options.container, 'position') === 'static') {
			options.container.style.position = 'relative';
		}
					
		// normalize accept option (could be list of mime types or array of title/extensions pairs)
		if (typeof(options.accept) === 'string') {
			options.accept = Mime.mimes2extList(options.accept);
		}

		RuntimeClient.call(self);

		Basic.extend(self, {
			uid: Basic.guid('uid_'),

			ruid: null,

			files: null,

			init: function() {
	
				self.convertEventPropsToHandlers(dispatches);
		
				self.bind('RuntimeInit', function(e, runtime) {
					self.ruid = runtime.uid;

					self.bind("Drop", function() {
						var files = runtime.exec.call(self, 'FileDrop', 'getFiles');

						self.files = [];

						Basic.each(files, function(file) {
							self.files.push(new File(self.ruid, file));
						});
					}, 999);

					runtime.exec.call(self, 'FileDrop', 'init', options);

					self.dispatchEvent('ready');
				});
							
				// runtime needs: options.required_features, options.runtime_order and options.container
				self.connectRuntime(options); // throws RuntimeError
			},

			destroy: function() {
				var runtime = this.getRuntime();
				if (runtime) {
					runtime.exec.call(this, 'FileDrop', 'destroy');
					this.disconnectRuntime();
				}
				this.files = null;
			}
		});
	}

	FileDrop.prototype = EventTarget.instance;

	return FileDrop;
});

// Included from: src/javascript/runtime/RuntimeTarget.js

/**
 * RuntimeTarget.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/runtime/RuntimeTarget', [
	'moxie/core/utils/Basic',
	'moxie/runtime/RuntimeClient',
	"moxie/core/EventTarget"
], function(Basic, RuntimeClient, EventTarget) {
	/**
	Instance of this class can be used as a target for the events dispatched by shims,
	when allowing them onto components is for either reason inappropriate

	@class RuntimeTarget
	@constructor
	@protected
	@extends EventTarget
	*/
	function RuntimeTarget() {
		this.uid = Basic.guid('uid_');
		
		RuntimeClient.call(this);

		this.destroy = function() {
			this.disconnectRuntime();
			this.unbindAll();
		};
	}

	RuntimeTarget.prototype = EventTarget.instance;

	return RuntimeTarget;
});

// Included from: src/javascript/file/FileReader.js

/**
 * FileReader.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/file/FileReader', [
	'moxie/core/utils/Basic',
	'moxie/core/utils/Encode',
	'moxie/core/Exceptions',
	'moxie/core/EventTarget',
	'moxie/file/Blob',
	'moxie/file/File',
	'moxie/runtime/RuntimeTarget'
], function(Basic, Encode, x, EventTarget, Blob, File, RuntimeTarget) {
	/**
	Utility for preloading o.Blob/o.File objects in memory. By design closely follows [W3C FileReader](http://www.w3.org/TR/FileAPI/#dfn-filereader)
	interface. Where possible uses native FileReader, where - not falls back to shims.

	@class FileReader
	@constructor FileReader
	@extends EventTarget
	@uses RuntimeClient
	*/
	var dispatches = [

		/** 
		Dispatched when the read starts.

		@event loadstart
		@param {Object} event
		*/
		'loadstart', 

		/** 
		Dispatched while reading (and decoding) blob, and reporting partial Blob data (progess.loaded/progress.total).

		@event progress
		@param {Object} event
		*/
		'progress', 

		/** 
		Dispatched when the read has successfully completed.

		@event load
		@param {Object} event
		*/
		'load', 

		/** 
		Dispatched when the read has been aborted. For instance, by invoking the abort() method.

		@event abort
		@param {Object} event
		*/
		'abort', 

		/** 
		Dispatched when the read has failed.

		@event error
		@param {Object} event
		*/
		'error', 

		/** 
		Dispatched when the request has completed (either in success or failure).

		@event loadend
		@param {Object} event
		*/
		'loadend'
	];
	
	function FileReader() {
		var self = this, _fr;
				
		Basic.extend(this, {
			/**
			UID of the component instance.

			@property uid
			@type {String}
			*/
			uid: Basic.guid('uid_'),

			/**
			Contains current state of FileReader object. Can take values of FileReader.EMPTY, FileReader.LOADING
			and FileReader.DONE.

			@property readyState
			@type {Number}
			@default FileReader.EMPTY
			*/
			readyState: FileReader.EMPTY,
			
			/**
			Result of the successful read operation.

			@property result
			@type {String}
			*/
			result: null,
			
			/**
			Stores the error of failed asynchronous read operation.

			@property error
			@type {DOMError}
			*/
			error: null,
			
			/**
			Initiates reading of File/Blob object contents to binary string.

			@method readAsBinaryString
			@param {Blob|File} blob Object to preload
			*/
			readAsBinaryString: function(blob) {
				_read.call(this, 'readAsBinaryString', blob);
			},
			
			/**
			Initiates reading of File/Blob object contents to dataURL string.

			@method readAsDataURL
			@param {Blob|File} blob Object to preload
			*/
			readAsDataURL: function(blob) {
				_read.call(this, 'readAsDataURL', blob);
			},
			
			/**
			Initiates reading of File/Blob object contents to string.

			@method readAsText
			@param {Blob|File} blob Object to preload
			*/
			readAsText: function(blob) {
				_read.call(this, 'readAsText', blob);
			},
			
			/**
			Aborts preloading process.

			@method abort
			*/
			abort: function() {
				this.result = null;
				
				if (Basic.inArray(this.readyState, [FileReader.EMPTY, FileReader.DONE]) !== -1) {
					return;
				} else if (this.readyState === FileReader.LOADING) {
					this.readyState = FileReader.DONE;
				}

				if (_fr) {
					_fr.getRuntime().exec.call(this, 'FileReader', 'abort');
				}
				
				this.trigger('abort');
				this.trigger('loadend');
			},

			/**
			Destroy component and release resources.

			@method destroy
			*/
			destroy: function() {
				this.abort();

				if (_fr) {
					_fr.getRuntime().exec.call(this, 'FileReader', 'destroy');
					_fr.disconnectRuntime();
				}

				self = _fr = null;
			}
		});
		
		
		function _read(op, blob) {
			_fr = new RuntimeTarget();

			function error(err) {
				self.readyState = FileReader.DONE;
				self.error = err;
				self.trigger('error');
				loadEnd();
			}

			function loadEnd() {
				_fr.destroy();
				_fr = null;
				self.trigger('loadend');
			}

			function exec(runtime) {
				_fr.bind('Error', function(e, err) {
					error(err);
				});

				_fr.bind('Progress', function(e) {
					self.result = runtime.exec.call(_fr, 'FileReader', 'getResult');
					self.trigger(e);
				});
				
				_fr.bind('Load', function(e) {
					self.readyState = FileReader.DONE;
					self.result = runtime.exec.call(_fr, 'FileReader', 'getResult');
					self.trigger(e);
					loadEnd();
				});

				runtime.exec.call(_fr, 'FileReader', 'read', op, blob);
			}

			this.convertEventPropsToHandlers(dispatches);

			if (this.readyState === FileReader.LOADING) {
				return error(new x.DOMException(x.DOMException.INVALID_STATE_ERR));
			}

			this.readyState = FileReader.LOADING;
			this.trigger('loadstart');

			// if source is o.Blob/o.File
			if (blob instanceof Blob) {
				if (blob.isDetached()) {
					var src = blob.getSource();
					switch (op) {
						case 'readAsText':
						case 'readAsBinaryString':
							this.result = src;
							break;
						case 'readAsDataURL':
							this.result = 'data:' + blob.type + ';base64,' + Encode.btoa(src);
							break;
					}
					this.readyState = FileReader.DONE;
					this.trigger('load');
					loadEnd();
				} else {
					exec(_fr.connectRuntime(blob.ruid));
				}
			} else {
				error(new x.DOMException(x.DOMException.NOT_FOUND_ERR));
			}
		}
	}
	
	/**
	Initial FileReader state

	@property EMPTY
	@type {Number}
	@final
	@static
	@default 0
	*/
	FileReader.EMPTY = 0;

	/**
	FileReader switches to this state when it is preloading the source

	@property LOADING
	@type {Number}
	@final
	@static
	@default 1
	*/
	FileReader.LOADING = 1;

	/**
	Preloading is complete, this is a final state

	@property DONE
	@type {Number}
	@final
	@static
	@default 2
	*/
	FileReader.DONE = 2;

	FileReader.prototype = EventTarget.instance;

	return FileReader;
});

// Included from: src/javascript/core/utils/Url.js

/**
 * Url.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/core/utils/Url', [], function() {
	/**
	Parse url into separate components and fill in absent parts with parts from current url,
	based on https://raw.github.com/kvz/phpjs/master/functions/url/parse_url.js

	@method parseUrl
	@for Utils
	@static
	@param {String} url Url to parse (defaults to empty string if undefined)
	@return {Object} Hash containing extracted uri components
	*/
	var parseUrl = function(url, currentUrl) {
		var key = ['source', 'scheme', 'authority', 'userInfo', 'user', 'pass', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'fragment']
		, i = key.length
		, ports = {
			http: 80,
			https: 443
		}
		, uri = {}
		, regex = /^(?:([^:\/?#]+):)?(?:\/\/()(?:(?:()(?:([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?()(?:(()(?:(?:[^?#\/]*\/)*)()(?:[^?#]*))(?:\\?([^#]*))?(?:#(.*))?)/
		, m = regex.exec(url || '')
		;
					
		while (i--) {
			if (m[i]) {
				uri[key[i]] = m[i];
			}
		}

		// when url is relative, we set the origin and the path ourselves
		if (!uri.scheme) {
			// come up with defaults
			if (!currentUrl || typeof(currentUrl) === 'string') {
				currentUrl = parseUrl(currentUrl || document.location.href);
			}

			uri.scheme = currentUrl.scheme;
			uri.host = currentUrl.host;
			uri.port = currentUrl.port;

			var path = '';
			// for urls without trailing slash we need to figure out the path
			if (/^[^\/]/.test(uri.path)) {
				path = currentUrl.path;
				// if path ends with a filename, strip it
				if (!/(\/|\/[^\.]+)$/.test(path)) {
					path = path.replace(/\/[^\/]+$/, '/');
				} else {
					path += '/';
				}
			}
			uri.path = path + (uri.path || ''); // site may reside at domain.com or domain.com/subdir
		}

		if (!uri.port) {
			uri.port = ports[uri.scheme] || 80;
		} 
		
		uri.port = parseInt(uri.port, 10);

		if (!uri.path) {
			uri.path = "/";
		}

		delete uri.source;

		return uri;
	};

	/**
	Resolve url - among other things will turn relative url to absolute

	@method resolveUrl
	@static
	@param {String} url Either absolute or relative
	@return {String} Resolved, absolute url
	*/
	var resolveUrl = function(url) {
		var ports = { // we ignore default ports
			http: 80,
			https: 443
		}
		, urlp = parseUrl(url)
		;

		return urlp.scheme + '://' + urlp.host + (urlp.port !== ports[urlp.scheme] ? ':' + urlp.port : '') + urlp.path + (urlp.query ? urlp.query : '');
	};

	/**
	Check if specified url has the same origin as the current document

	@method hasSameOrigin
	@param {String|Object} url
	@return {Boolean}
	*/
	var hasSameOrigin = function(url) {
		function origin(url) {
			return [url.scheme, url.host, url.port].join('/');
		}
			
		if (typeof url === 'string') {
			url = parseUrl(url);
		}	
		
		return origin(parseUrl()) === origin(url);
	};

	return {
		parseUrl: parseUrl,
		resolveUrl: resolveUrl,
		hasSameOrigin: hasSameOrigin
	};
});

// Included from: src/javascript/file/FileReaderSync.js

/**
 * FileReaderSync.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/file/FileReaderSync', [
	'moxie/core/utils/Basic',
	'moxie/runtime/RuntimeClient',
	'moxie/core/utils/Encode'
], function(Basic, RuntimeClient, Encode) {
	/**
	Synchronous FileReader implementation. Something like this is available in WebWorkers environment, here
	it can be used to read only preloaded blobs/files and only below certain size (not yet sure what that'd be,
	but probably < 1mb). Not meant to be used directly by user.

	@class FileReaderSync
	@private
	@constructor
	*/
	return function() {
		RuntimeClient.call(this);

		Basic.extend(this, {
			uid: Basic.guid('uid_'),

			readAsBinaryString: function(blob) {
				return _read.call(this, 'readAsBinaryString', blob);
			},
			
			readAsDataURL: function(blob) {
				return _read.call(this, 'readAsDataURL', blob);
			},
			
			/*readAsArrayBuffer: function(blob) {
				return _read.call(this, 'readAsArrayBuffer', blob);
			},*/
			
			readAsText: function(blob) {
				return _read.call(this, 'readAsText', blob);
			}
		});

		function _read(op, blob) {
			if (blob.isDetached()) {
				var src = blob.getSource();
				switch (op) {
					case 'readAsBinaryString':
						return src;
					case 'readAsDataURL':
						return 'data:' + blob.type + ';base64,' + Encode.btoa(src);
					case 'readAsText':
						var txt = '';
						for (var i = 0, length = src.length; i < length; i++) {
							txt += String.fromCharCode(src[i]);
						}
						return txt;
				}
			} else {
				var result = this.connectRuntime(blob.ruid).exec.call(this, 'FileReaderSync', 'read', op, blob);
				this.disconnectRuntime();
				return result;
			}
		}
	};
});

// Included from: src/javascript/xhr/FormData.js

/**
 * FormData.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define("moxie/xhr/FormData", [
	"moxie/core/Exceptions",
	"moxie/core/utils/Basic",
	"moxie/file/Blob"
], function(x, Basic, Blob) {
	/**
	FormData

	@class FormData
	@constructor
	*/
	function FormData() {
		var _blob, _fields = [];

		Basic.extend(this, {
			/**
			Append another key-value pair to the FormData object

			@method append
			@param {String} name Name for the new field
			@param {String|Blob|Array|Object} value Value for the field
			*/
			append: function(name, value) {
				var self = this, valueType = Basic.typeOf(value);

				// according to specs value might be either Blob or String
				if (value instanceof Blob) {
					_blob = {
						name: name,
						value: value // unfortunately we can only send single Blob in one FormData
					};
				} else if ('array' === valueType) {
					name += '[]';

					Basic.each(value, function(value) {
						self.append(name, value);
					});
				} else if ('object' === valueType) {
					Basic.each(value, function(value, key) {
						self.append(name + '[' + key + ']', value);
					});
				} else if ('null' === valueType || 'undefined' === valueType || 'number' === valueType && isNaN(value)) {
					self.append(name, "false");
				} else {
					_fields.push({
						name: name,
						value: value.toString()
					});
				}
			},

			/**
			Checks if FormData contains Blob.

			@method hasBlob
			@return {Boolean}
			*/
			hasBlob: function() {
				return !!this.getBlob();
			},

			/**
			Retrieves blob.

			@method getBlob
			@return {Object} Either Blob if found or null
			*/
			getBlob: function() {
				return _blob && _blob.value || null;
			},

			/**
			Retrieves blob field name.

			@method getBlobName
			@return {String} Either Blob field name or null
			*/
			getBlobName: function() {
				return _blob && _blob.name || null;
			},

			/**
			Loop over the fields in FormData and invoke the callback for each of them.

			@method each
			@param {Function} cb Callback to call for each field
			*/
			each: function(cb) {
				Basic.each(_fields, function(field) {
					cb(field.value, field.name);
				});

				if (_blob) {
					cb(_blob.value, _blob.name);
				}
			},

			destroy: function() {
				_blob = null;
				_fields = [];
			}
		});
	}

	return FormData;
});

// Included from: src/javascript/xhr/XMLHttpRequest.js

/**
 * XMLHttpRequest.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define("moxie/xhr/XMLHttpRequest", [
	"moxie/core/utils/Basic",
	"moxie/core/Exceptions",
	"moxie/core/EventTarget",
	"moxie/core/utils/Encode",
	"moxie/core/utils/Url",
	"moxie/runtime/Runtime",
	"moxie/runtime/RuntimeTarget",
	"moxie/file/Blob",
	"moxie/file/FileReaderSync",
	"moxie/xhr/FormData",
	"moxie/core/utils/Env",
	"moxie/core/utils/Mime"
], function(Basic, x, EventTarget, Encode, Url, Runtime, RuntimeTarget, Blob, FileReaderSync, FormData, Env, Mime) {

	var httpCode = {
		100: 'Continue',
		101: 'Switching Protocols',
		102: 'Processing',

		200: 'OK',
		201: 'Created',
		202: 'Accepted',
		203: 'Non-Authoritative Information',
		204: 'No Content',
		205: 'Reset Content',
		206: 'Partial Content',
		207: 'Multi-Status',
		226: 'IM Used',

		300: 'Multiple Choices',
		301: 'Moved Permanently',
		302: 'Found',
		303: 'See Other',
		304: 'Not Modified',
		305: 'Use Proxy',
		306: 'Reserved',
		307: 'Temporary Redirect',

		400: 'Bad Request',
		401: 'Unauthorized',
		402: 'Payment Required',
		403: 'Forbidden',
		404: 'Not Found',
		405: 'Method Not Allowed',
		406: 'Not Acceptable',
		407: 'Proxy Authentication Required',
		408: 'Request Timeout',
		409: 'Conflict',
		410: 'Gone',
		411: 'Length Required',
		412: 'Precondition Failed',
		413: 'Request Entity Too Large',
		414: 'Request-URI Too Long',
		415: 'Unsupported Media Type',
		416: 'Requested Range Not Satisfiable',
		417: 'Expectation Failed',
		422: 'Unprocessable Entity',
		423: 'Locked',
		424: 'Failed Dependency',
		426: 'Upgrade Required',

		500: 'Internal Server Error',
		501: 'Not Implemented',
		502: 'Bad Gateway',
		503: 'Service Unavailable',
		504: 'Gateway Timeout',
		505: 'HTTP Version Not Supported',
		506: 'Variant Also Negotiates',
		507: 'Insufficient Storage',
		510: 'Not Extended'
	};

	function XMLHttpRequestUpload() {
		this.uid = Basic.guid('uid_');
	}
	
	XMLHttpRequestUpload.prototype = EventTarget.instance;

	/**
	Implementation of XMLHttpRequest

	@class XMLHttpRequest
	@constructor
	@uses RuntimeClient
	@extends EventTarget
	*/
	var dispatches = ['loadstart', 'progress', 'abort', 'error', 'load', 'timeout', 'loadend']; // & readystatechange (for historical reasons)
	
	var NATIVE = 1, RUNTIME = 2;
					
	function XMLHttpRequest() {
		var self = this,
			// this (together with _p() @see below) is here to gracefully upgrade to setter/getter syntax where possible
			props = {
				/**
				The amount of milliseconds a request can take before being terminated. Initially zero. Zero means there is no timeout.

				@property timeout
				@type Number
				@default 0
				*/
				timeout: 0,

				/**
				Current state, can take following values:
				UNSENT (numeric value 0)
				The object has been constructed.

				OPENED (numeric value 1)
				The open() method has been successfully invoked. During this state request headers can be set using setRequestHeader() and the request can be made using the send() method.

				HEADERS_RECEIVED (numeric value 2)
				All redirects (if any) have been followed and all HTTP headers of the final response have been received. Several response members of the object are now available.

				LOADING (numeric value 3)
				The response entity body is being received.

				DONE (numeric value 4)

				@property readyState
				@type Number
				@default 0 (UNSENT)
				*/
				readyState: XMLHttpRequest.UNSENT,

				/**
				True when user credentials are to be included in a cross-origin request. False when they are to be excluded
				in a cross-origin request and when cookies are to be ignored in its response. Initially false.

				@property withCredentials
				@type Boolean
				@default false
				*/
				withCredentials: false,

				/**
				Returns the HTTP status code.

				@property status
				@type Number
				@default 0
				*/
				status: 0,

				/**
				Returns the HTTP status text.

				@property statusText
				@type String
				*/
				statusText: "",

				/**
				Returns the response type. Can be set to change the response type. Values are:
				the empty string (default), "arraybuffer", "blob", "document", "json", and "text".
				
				@property responseType
				@type String
				*/
				responseType: "",

				/**
				Returns the document response entity body.
				
				Throws an "InvalidStateError" exception if responseType is not the empty string or "document".

				@property responseXML
				@type Document
				*/
				responseXML: null,

				/**
				Returns the text response entity body.
				
				Throws an "InvalidStateError" exception if responseType is not the empty string or "text".

				@property responseText
				@type String
				*/
				responseText: null,

				/**
				Returns the response entity body (http://www.w3.org/TR/XMLHttpRequest/#response-entity-body).
				Can become: ArrayBuffer, Blob, Document, JSON, Text
				
				@property response
				@type Mixed
				*/
				response: null
			},

			_async = true,
			_url,
			_method,
			_headers = {},
			_user,
			_password,
			_encoding = null,
			_mimeType = null,

			// flags
			_sync_flag = false,
			_send_flag = false,
			_upload_events_flag = false,
			_upload_complete_flag = false,
			_error_flag = false,
			_same_origin_flag = false,

			// times
			_start_time,
			_timeoutset_time,

			_finalMime = null,
			_finalCharset = null,

			_options = {},
			_xhr,
			_responseHeaders = '',
			_responseHeadersBag
			;

		
		Basic.extend(this, props, {
			/**
			Unique id of the component

			@property uid
			@type String
			*/
			uid: Basic.guid('uid_'),
			
			/**
			Target for Upload events

			@property upload
			@type XMLHttpRequestUpload
			*/
			upload: new XMLHttpRequestUpload(),
			

			/**
			Sets the request method, request URL, synchronous flag, request username, and request password.

			Throws a "SyntaxError" exception if one of the following is true:

			method is not a valid HTTP method.
			url cannot be resolved.
			url contains the "user:password" format in the userinfo production.
			Throws a "SecurityError" exception if method is a case-insensitive match for CONNECT, TRACE or TRACK.

			Throws an "InvalidAccessError" exception if one of the following is true:

			Either user or password is passed as argument and the origin of url does not match the XMLHttpRequest origin.
			There is an associated XMLHttpRequest document and either the timeout attribute is not zero,
			the withCredentials attribute is true, or the responseType attribute is not the empty string.


			@method open
			@param {String} method HTTP method to use on request
			@param {String} url URL to request
			@param {Boolean} [async=true] If false request will be done in synchronous manner. Asynchronous by default.
			@param {String} [user] Username to use in HTTP authentication process on server-side
			@param {String} [password] Password to use in HTTP authentication process on server-side
			*/
			open: function(method, url, async, user, password) {
				var urlp;
				
				// first two arguments are required
				if (!method || !url) {
					throw new x.DOMException(x.DOMException.SYNTAX_ERR);
				}
				
				// 2 - check if any code point in method is higher than U+00FF or after deflating method it does not match the method
				if (/[\u0100-\uffff]/.test(method) || Encode.utf8_encode(method) !== method) {
					throw new x.DOMException(x.DOMException.SYNTAX_ERR);
				}

				// 3
				if (!!~Basic.inArray(method.toUpperCase(), ['CONNECT', 'DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'TRACE', 'TRACK'])) {
					_method = method.toUpperCase();
				}
				
				
				// 4 - allowing these methods poses a security risk
				if (!!~Basic.inArray(_method, ['CONNECT', 'TRACE', 'TRACK'])) {
					throw new x.DOMException(x.DOMException.SECURITY_ERR);
				}

				// 5
				url = Encode.utf8_encode(url);
				
				// 6 - Resolve url relative to the XMLHttpRequest base URL. If the algorithm returns an error, throw a "SyntaxError".
				urlp = Url.parseUrl(url);

				_same_origin_flag = Url.hasSameOrigin(urlp);
																
				// 7 - manually build up absolute url
				_url = Url.resolveUrl(url);
		
				// 9-10, 12-13
				if ((user || password) && !_same_origin_flag) {
					throw new x.DOMException(x.DOMException.INVALID_ACCESS_ERR);
				}

				_user = user || urlp.user;
				_password = password || urlp.pass;
				
				// 11
				_async = async || true;
				
				if (_async === false && (_p('timeout') || _p('withCredentials') || _p('responseType') !== "")) {
					throw new x.DOMException(x.DOMException.INVALID_ACCESS_ERR);
				}
				
				// 14 - terminate abort()
				
				// 15 - terminate send()

				// 18
				_sync_flag = !_async;
				_send_flag = false;
				_headers = {};
				_reset.call(this);

				// 19
				_p('readyState', XMLHttpRequest.OPENED);
				
				// 20
				this.convertEventPropsToHandlers(['readystatechange']); // unify event handlers
				this.dispatchEvent('readystatechange');
			},
			
			/**
			Appends an header to the list of author request headers, or if header is already
			in the list of author request headers, combines its value with value.

			Throws an "InvalidStateError" exception if the state is not OPENED or if the send() flag is set.
			Throws a "SyntaxError" exception if header is not a valid HTTP header field name or if value
			is not a valid HTTP header field value.
			
			@method setRequestHeader
			@param {String} header
			@param {String|Number} value
			*/
			setRequestHeader: function(header, value) {
				var uaHeaders = [ // these headers are controlled by the user agent
						"accept-charset",
						"accept-encoding",
						"access-control-request-headers",
						"access-control-request-method",
						"connection",
						"content-length",
						"cookie",
						"cookie2",
						"content-transfer-encoding",
						"date",
						"expect",
						"host",
						"keep-alive",
						"origin",
						"referer",
						"te",
						"trailer",
						"transfer-encoding",
						"upgrade",
						"user-agent",
						"via"
					];
				
				// 1-2
				if (_p('readyState') !== XMLHttpRequest.OPENED || _send_flag) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				// 3
				if (/[\u0100-\uffff]/.test(header) || Encode.utf8_encode(header) !== header) {
					throw new x.DOMException(x.DOMException.SYNTAX_ERR);
				}

				// 4
				/* this step is seemingly bypassed in browsers, probably to allow various unicode characters in header values
				if (/[\u0100-\uffff]/.test(value) || Encode.utf8_encode(value) !== value) {
					throw new x.DOMException(x.DOMException.SYNTAX_ERR);
				}*/

				header = Basic.trim(header).toLowerCase();
				
				// setting of proxy-* and sec-* headers is prohibited by spec
				if (!!~Basic.inArray(header, uaHeaders) || /^(proxy\-|sec\-)/.test(header)) {
					return false;
				}

				// camelize
				// browsers lowercase header names (at least for custom ones)
				// header = header.replace(/\b\w/g, function($1) { return $1.toUpperCase(); });
				
				if (!_headers[header]) {
					_headers[header] = value;
				} else {
					// http://tools.ietf.org/html/rfc2616#section-4.2 (last paragraph)
					_headers[header] += ', ' + value;
				}
				return true;
			},

			/**
			Returns all headers from the response, with the exception of those whose field name is Set-Cookie or Set-Cookie2.

			@method getAllResponseHeaders
			@return {String} reponse headers or empty string
			*/
			getAllResponseHeaders: function() {
				return _responseHeaders || '';
			},

			/**
			Returns the header field value from the response of which the field name matches header, 
			unless the field name is Set-Cookie or Set-Cookie2.

			@method getResponseHeader
			@param {String} header
			@return {String} value(s) for the specified header or null
			*/
			getResponseHeader: function(header) {
				header = header.toLowerCase();

				if (_error_flag || !!~Basic.inArray(header, ['set-cookie', 'set-cookie2'])) {
					return null;
				}

				if (_responseHeaders && _responseHeaders !== '') {
					// if we didn't parse response headers until now, do it and keep for later
					if (!_responseHeadersBag) {
						_responseHeadersBag = {};
						Basic.each(_responseHeaders.split(/\r\n/), function(line) {
							var pair = line.split(/:\s+/);
							if (pair.length === 2) { // last line might be empty, omit
								pair[0] = Basic.trim(pair[0]); // just in case
								_responseHeadersBag[pair[0].toLowerCase()] = { // simply to retain header name in original form
									header: pair[0],
									value: Basic.trim(pair[1])
								};
							}
						});
					}
					if (_responseHeadersBag.hasOwnProperty(header)) {
						return _responseHeadersBag[header].header + ': ' + _responseHeadersBag[header].value;
					}
				}
				return null;
			},
			
			/**
			Sets the Content-Type header for the response to mime.
			Throws an "InvalidStateError" exception if the state is LOADING or DONE.
			Throws a "SyntaxError" exception if mime is not a valid media type.

			@method overrideMimeType
			@param String mime Mime type to set
			*/
			overrideMimeType: function(mime) {
				var matches, charset;
			
				// 1
				if (!!~Basic.inArray(_p('readyState'), [XMLHttpRequest.LOADING, XMLHttpRequest.DONE])) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				// 2
				mime = Basic.trim(mime.toLowerCase());

				if (/;/.test(mime) && (matches = mime.match(/^([^;]+)(?:;\scharset\=)?(.*)$/))) {
					mime = matches[1];
					if (matches[2]) {
						charset = matches[2];
					}
				}

				if (!Mime.mimes[mime]) {
					throw new x.DOMException(x.DOMException.SYNTAX_ERR);
				}

				// 3-4
				_finalMime = mime;
				_finalCharset = charset;
			},
			
			/**
			Initiates the request. The optional argument provides the request entity body.
			The argument is ignored if request method is GET or HEAD.

			Throws an "InvalidStateError" exception if the state is not OPENED or if the send() flag is set.

			@method send
			@param {Blob|Document|String|FormData} [data] Request entity body
			@param {Object} [options] Set of requirements and pre-requisities for runtime initialization
			*/
			send: function(data, options) {					
				if (Basic.typeOf(options) === 'string') {
					_options = { ruid: options };
				} else if (!options) {
					_options = {};
				} else {
					_options = options;
				}
													
				this.convertEventPropsToHandlers(dispatches);
				this.upload.convertEventPropsToHandlers(dispatches);
															
				// 1-2
				if (this.readyState !== XMLHttpRequest.OPENED || _send_flag) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}
				
				// 3					
				// sending Blob
				if (data instanceof Blob) {
					_options.ruid = data.ruid;
					_mimeType = data.type || 'application/octet-stream';
				}
				
				// FormData
				else if (data instanceof FormData) {
					if (data.hasBlob()) {
						var blob = data.getBlob();
						_options.ruid = blob.ruid;
						_mimeType = blob.type || 'application/octet-stream';
					}
				}
				
				// DOMString
				else if (typeof data === 'string') {
					_encoding = 'UTF-8';
					_mimeType = 'text/plain;charset=UTF-8';
					
					// data should be converted to Unicode and encoded as UTF-8
					data = Encode.utf8_encode(data);
				}

				// if withCredentials not set, but requested, set it automatically
				if (!this.withCredentials) {
					this.withCredentials = (_options.required_caps && _options.required_caps.send_browser_cookies) && !_same_origin_flag;
				}

				// 4 - storage mutex
				// 5
				_upload_events_flag = (!_sync_flag && this.upload.hasEventListener()); // DSAP
				// 6
				_error_flag = false;
				// 7
				_upload_complete_flag = !data;
				// 8 - Asynchronous steps
				if (!_sync_flag) {
					// 8.1
					_send_flag = true;
					// 8.2
					// this.dispatchEvent('loadstart'); // will be dispatched either by native or runtime xhr
					// 8.3
					//if (!_upload_complete_flag) {
						// this.upload.dispatchEvent('loadstart');	// will be dispatched either by native or runtime xhr
					//}
				}
				// 8.5 - Return the send() method call, but continue running the steps in this algorithm.
				_doXHR.call(this, data);
			},
			
			/**
			Cancels any network activity.
			
			@method abort
			*/
			abort: function() {
				_error_flag = true;
				_sync_flag = false;

				if (!~Basic.inArray(_p('readyState'), [XMLHttpRequest.UNSENT, XMLHttpRequest.OPENED, XMLHttpRequest.DONE])) {
					_p('readyState', XMLHttpRequest.DONE);
					_send_flag = false;

					if (_xhr) {
						_xhr.getRuntime().exec.call(_xhr, 'XMLHttpRequest', 'abort', _upload_complete_flag);
					} else {
						throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
					}

					_upload_complete_flag = true;
				} else {
					_p('readyState', XMLHttpRequest.UNSENT);
				}
			},

			destroy: function() {
				if (_xhr) {
					if (Basic.typeOf(_xhr.destroy) === 'function') {
						_xhr.destroy();
					}
					_xhr = null;
				}

				this.unbindAll();

				if (this.upload) {
					this.upload.unbindAll();
					this.upload = null;
				}
			}
		});

		/* this is nice, but maybe too lengthy

		// if supported by JS version, set getters/setters for specific properties
		o.defineProperty(this, 'readyState', {
			configurable: false,

			get: function() {
				return _p('readyState');
			}
		});

		o.defineProperty(this, 'timeout', {
			configurable: false,

			get: function() {
				return _p('timeout');
			},

			set: function(value) {

				if (_sync_flag) {
					throw new x.DOMException(x.DOMException.INVALID_ACCESS_ERR);
				}

				// timeout still should be measured relative to the start time of request
				_timeoutset_time = (new Date).getTime();

				_p('timeout', value);
			}
		});

		// the withCredentials attribute has no effect when fetching same-origin resources
		o.defineProperty(this, 'withCredentials', {
			configurable: false,

			get: function() {
				return _p('withCredentials');
			},

			set: function(value) {
				// 1-2
				if (!~o.inArray(_p('readyState'), [XMLHttpRequest.UNSENT, XMLHttpRequest.OPENED]) || _send_flag) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				// 3-4
				if (_anonymous_flag || _sync_flag) {
					throw new x.DOMException(x.DOMException.INVALID_ACCESS_ERR);
				}

				// 5
				_p('withCredentials', value);
			}
		});

		o.defineProperty(this, 'status', {
			configurable: false,

			get: function() {
				return _p('status');
			}
		});

		o.defineProperty(this, 'statusText', {
			configurable: false,

			get: function() {
				return _p('statusText');
			}
		});

		o.defineProperty(this, 'responseType', {
			configurable: false,

			get: function() {
				return _p('responseType');
			},

			set: function(value) {
				// 1
				if (!!~o.inArray(_p('readyState'), [XMLHttpRequest.LOADING, XMLHttpRequest.DONE])) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				// 2
				if (_sync_flag) {
					throw new x.DOMException(x.DOMException.INVALID_ACCESS_ERR);
				}

				// 3
				_p('responseType', value.toLowerCase());
			}
		});

		o.defineProperty(this, 'responseText', {
			configurable: false,

			get: function() {
				// 1
				if (!~o.inArray(_p('responseType'), ['', 'text'])) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				// 2-3
				if (_p('readyState') !== XMLHttpRequest.DONE && _p('readyState') !== XMLHttpRequest.LOADING || _error_flag) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				return _p('responseText');
			}
		});

		o.defineProperty(this, 'responseXML', {
			configurable: false,

			get: function() {
				// 1
				if (!~o.inArray(_p('responseType'), ['', 'document'])) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				// 2-3
				if (_p('readyState') !== XMLHttpRequest.DONE || _error_flag) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				return _p('responseXML');
			}
		});

		o.defineProperty(this, 'response', {
			configurable: false,

			get: function() {
				if (!!~o.inArray(_p('responseType'), ['', 'text'])) {
					if (_p('readyState') !== XMLHttpRequest.DONE && _p('readyState') !== XMLHttpRequest.LOADING || _error_flag) {
						return '';
					}
				}

				if (_p('readyState') !== XMLHttpRequest.DONE || _error_flag) {
					return null;
				}

				return _p('response');
			}
		});

		*/

		function _p(prop, value) {
			if (!props.hasOwnProperty(prop)) {
				return;
			}
			if (arguments.length === 1) { // get
				return Env.can('define_property') ? props[prop] : self[prop];
			} else { // set
				if (Env.can('define_property')) {
					props[prop] = value;
				} else {
					self[prop] = value;
				}
			}
		}
		
		/*
		function _toASCII(str, AllowUnassigned, UseSTD3ASCIIRules) {
			// TODO: http://tools.ietf.org/html/rfc3490#section-4.1
			return str.toLowerCase();
		}
		*/
		
		
		function _doXHR(data) {
			var self = this;
			
			_start_time = new Date().getTime();

			_xhr = new RuntimeTarget();

			function loadEnd() {
				_xhr.destroy();
				_xhr = null;
				self.dispatchEvent('loadend');
				self = null;
			}

			function exec(runtime) {
				_xhr.bind('LoadStart', function(e) {
					_p('readyState', XMLHttpRequest.LOADING);
					self.dispatchEvent('readystatechange');

					self.dispatchEvent(e);
					
					if (_upload_events_flag) {
						self.upload.dispatchEvent(e);
					}
				});
				
				_xhr.bind('Progress', function(e) {
					if (_p('readyState') !== XMLHttpRequest.LOADING) {
						_p('readyState', XMLHttpRequest.LOADING); // LoadStart unreliable (in Flash for example)
						self.dispatchEvent('readystatechange');
					}
					self.dispatchEvent(e);
				});
				
				_xhr.bind('UploadProgress', function(e) {
					if (_upload_events_flag) {
						self.upload.dispatchEvent({
							type: 'progress',
							lengthComputable: false,
							total: e.total,
							loaded: e.loaded
						});
					}
				});
				
				_xhr.bind('Load', function(e) {
					_p('readyState', XMLHttpRequest.DONE);
					_p('status', Number(runtime.exec.call(_xhr, 'XMLHttpRequest', 'getStatus') || 0));
					_p('statusText', httpCode[_p('status')] || "");
					
					_p('response', runtime.exec.call(_xhr, 'XMLHttpRequest', 'getResponse', _p('responseType')));

					if (!!~Basic.inArray(_p('responseType'), ['text', ''])) {
						_p('responseText', _p('response'));
					} else if (_p('responseType') === 'document') {
						_p('responseXML', _p('response'));
					}

					_responseHeaders = runtime.exec.call(_xhr, 'XMLHttpRequest', 'getAllResponseHeaders');

					self.dispatchEvent('readystatechange');
					
					if (_p('status') > 0) { // status 0 usually means that server is unreachable
						if (_upload_events_flag) {
							self.upload.dispatchEvent(e);
						}
						self.dispatchEvent(e);
					} else {
						_error_flag = true;
						self.dispatchEvent('error');
					}
					loadEnd();
				});

				_xhr.bind('Abort', function(e) {
					self.dispatchEvent(e);
					loadEnd();
				});
				
				_xhr.bind('Error', function(e) {
					_error_flag = true;
					_p('readyState', XMLHttpRequest.DONE);
					self.dispatchEvent('readystatechange');
					_upload_complete_flag = true;
					self.dispatchEvent(e);
					loadEnd();
				});

				runtime.exec.call(_xhr, 'XMLHttpRequest', 'send', {
					url: _url,
					method: _method,
					async: _async,
					user: _user,
					password: _password,
					headers: _headers,
					mimeType: _mimeType,
					encoding: _encoding,
					responseType: self.responseType,
					withCredentials: self.withCredentials,
					options: _options
				}, data);
			}

			// clarify our requirements
			if (typeof(_options.required_caps) === 'string') {
				_options.required_caps = Runtime.parseCaps(_options.required_caps);
			}

			_options.required_caps = Basic.extend({}, _options.required_caps, {
				return_response_type: self.responseType
			});

			if (data instanceof FormData) {
				_options.required_caps.send_multipart = true;
			}

			if (!_same_origin_flag) {
				_options.required_caps.do_cors = true;
			}
			

			if (_options.ruid) { // we do not need to wait if we can connect directly
				exec(_xhr.connectRuntime(_options));
			} else {
				_xhr.bind('RuntimeInit', function(e, runtime) {
					exec(runtime);
				});
				_xhr.bind('RuntimeError', function(e, err) {
					self.dispatchEvent('RuntimeError', err);
				});
				_xhr.connectRuntime(_options);
			}
		}
	
		
		function _reset() {
			_p('responseText', "");
			_p('responseXML', null);
			_p('response', null);
			_p('status', 0);
			_p('statusText', "");
			_start_time = _timeoutset_time = null;
		}
	}

	XMLHttpRequest.UNSENT = 0;
	XMLHttpRequest.OPENED = 1;
	XMLHttpRequest.HEADERS_RECEIVED = 2;
	XMLHttpRequest.LOADING = 3;
	XMLHttpRequest.DONE = 4;
	
	XMLHttpRequest.prototype = EventTarget.instance;

	return XMLHttpRequest;
});

// Included from: src/javascript/runtime/Transporter.js

/**
 * Transporter.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define("moxie/runtime/Transporter", [
	"moxie/core/utils/Basic",
	"moxie/core/utils/Encode",
	"moxie/runtime/RuntimeClient",
	"moxie/core/EventTarget"
], function(Basic, Encode, RuntimeClient, EventTarget) {
	function Transporter() {
		var mod, _runtime, _data, _size, _pos, _chunk_size;

		RuntimeClient.call(this);

		Basic.extend(this, {
			uid: Basic.guid('uid_'),

			state: Transporter.IDLE,

			result: null,

			transport: function(data, type, options) {
				var self = this;

				options = Basic.extend({
					chunk_size: 204798
				}, options);

				// should divide by three, base64 requires this
				if ((mod = options.chunk_size % 3)) {
					options.chunk_size += 3 - mod;
				}

				_chunk_size = options.chunk_size;

				_reset.call(this);
				_data = data;
				_size = data.length;

				if (Basic.typeOf(options) === 'string' || options.ruid) {
					_run.call(self, type, this.connectRuntime(options));
				} else {
					// we require this to run only once
					var cb = function(e, runtime) {
						self.unbind("RuntimeInit", cb);
						_run.call(self, type, runtime);
					};
					this.bind("RuntimeInit", cb);
					this.connectRuntime(options);
				}
			},

			abort: function() {
				var self = this;

				self.state = Transporter.IDLE;
				if (_runtime) {
					_runtime.exec.call(self, 'Transporter', 'clear');
					self.trigger("TransportingAborted");
				}

				_reset.call(self);
			},


			destroy: function() {
				this.unbindAll();
				_runtime = null;
				this.disconnectRuntime();
				_reset.call(this);
			}
		});

		function _reset() {
			_size = _pos = 0;
			_data = this.result = null;
		}

		function _run(type, runtime) {
			var self = this;

			_runtime = runtime;

			//self.unbind("RuntimeInit");

			self.bind("TransportingProgress", function(e) {
				_pos = e.loaded;

				if (_pos < _size && Basic.inArray(self.state, [Transporter.IDLE, Transporter.DONE]) === -1) {
					_transport.call(self);
				}
			}, 999);

			self.bind("TransportingComplete", function() {
				_pos = _size;
				self.state = Transporter.DONE;
				_data = null; // clean a bit
				self.result = _runtime.exec.call(self, 'Transporter', 'getAsBlob', type || '');
			}, 999);

			self.state = Transporter.BUSY;
			self.trigger("TransportingStarted");
			_transport.call(self);
		}

		function _transport() {
			var self = this,
				chunk,
				bytesLeft = _size - _pos;

			if (_chunk_size > bytesLeft) {
				_chunk_size = bytesLeft;
			}

			chunk = Encode.btoa(_data.substr(_pos, _chunk_size));
			_runtime.exec.call(self, 'Transporter', 'receive', chunk, _size);
		}
	}

	Transporter.IDLE = 0;
	Transporter.BUSY = 1;
	Transporter.DONE = 2;

	Transporter.prototype = EventTarget.instance;

	return Transporter;
});

// Included from: src/javascript/image/Image.js

/**
 * Image.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define("moxie/image/Image", [
	"moxie/core/utils/Basic",
	"moxie/core/utils/Dom",
	"moxie/core/Exceptions",
	"moxie/file/FileReaderSync",
	"moxie/xhr/XMLHttpRequest",
	"moxie/runtime/Runtime",
	"moxie/runtime/RuntimeClient",
	"moxie/runtime/Transporter",
	"moxie/core/utils/Env",
	"moxie/core/EventTarget",
	"moxie/file/Blob",
	"moxie/file/File",
	"moxie/core/utils/Encode"
], function(Basic, Dom, x, FileReaderSync, XMLHttpRequest, Runtime, RuntimeClient, Transporter, Env, EventTarget, Blob, File, Encode) {
	/**
	Image preloading and manipulation utility. Additionally it provides access to image meta info (Exif, GPS) and raw binary data.

	@class Image
	@constructor
	@extends EventTarget
	*/
	var dispatches = [
		'progress',

		/**
		Dispatched when loading is complete.

		@event load
		@param {Object} event
		*/
		'load',

		'error',

		/**
		Dispatched when resize operation is complete.
		
		@event resize
		@param {Object} event
		*/
		'resize',

		/**
		Dispatched when visual representation of the image is successfully embedded
		into the corresponsing container.

		@event embedded
		@param {Object} event
		*/
		'embedded'
	];

	function Image() {
		RuntimeClient.call(this);

		Basic.extend(this, {
			/**
			Unique id of the component

			@property uid
			@type {String}
			*/
			uid: Basic.guid('uid_'),

			/**
			Unique id of the connected runtime, if any.

			@property ruid
			@type {String}
			*/
			ruid: null,

			/**
			Name of the file, that was used to create an image, if available. If not equals to empty string.

			@property name
			@type {String}
			@default ""
			*/
			name: "",

			/**
			Size of the image in bytes. Actual value is set only after image is preloaded.

			@property size
			@type {Number}
			@default 0
			*/
			size: 0,

			/**
			Width of the image. Actual value is set only after image is preloaded.

			@property width
			@type {Number}
			@default 0
			*/
			width: 0,

			/**
			Height of the image. Actual value is set only after image is preloaded.

			@property height
			@type {Number}
			@default 0
			*/
			height: 0,

			/**
			Mime type of the image. Currently only image/jpeg and image/png are supported. Actual value is set only after image is preloaded.

			@property type
			@type {String}
			@default ""
			*/
			type: "",

			/**
			Holds meta info (Exif, GPS). Is populated only for image/jpeg. Actual value is set only after image is preloaded.

			@property meta
			@type {Object}
			@default {}
			*/
			meta: {},

			/**
			Alias for load method, that takes another mOxie.Image object as a source (see load).

			@method clone
			@param {Image} src Source for the image
			@param {Boolean} [exact=false] Whether to activate in-depth clone mode
			*/
			clone: function() {
				this.load.apply(this, arguments);
			},

			/**
			Loads image from various sources. Currently the source for new image can be: mOxie.Image, mOxie.Blob/mOxie.File, 
			native Blob/File, dataUrl or URL. Depending on the type of the source, arguments - differ. When source is URL, 
			Image will be downloaded from remote destination and loaded in memory.

			@example
				var img = new mOxie.Image();
				img.onload = function() {
					var blob = img.getAsBlob();
					
					var formData = new mOxie.FormData();
					formData.append('file', blob);

					var xhr = new mOxie.XMLHttpRequest();
					xhr.onload = function() {
						// upload complete
					};
					xhr.open('post', 'upload.php');
					xhr.send(formData);
				};
				img.load("http://www.moxiecode.com/images/mox-logo.jpg"); // notice file extension (.jpg)
			

			@method load
			@param {Image|Blob|File|String} src Source for the image
			@param {Boolean|Object} [mixed]
			*/
			load: function() {
				// this is here because to bind properly we need an uid first, which is created above
				this.bind('Load Resize', function() {
					_updateInfo.call(this);
				}, 999);

				this.convertEventPropsToHandlers(dispatches);

				_load.apply(this, arguments);
			},

			/**
			Downsizes the image to fit the specified width/height. If crop is supplied, image will be cropped to exact dimensions.

			@method downsize
			@param {Number} width Resulting width
			@param {Number} [height=width] Resulting height (optional, if not supplied will default to width)
			@param {Boolean} [crop=false] Whether to crop the image to exact dimensions
			@param {Boolean} [preserveHeaders=true] Whether to preserve meta headers (on JPEGs after resize)
			*/
			downsize: function(width, height, crop, preserveHeaders) {
				try {
					if (!this.size) { // only preloaded image objects can be used as source
						throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
					}

					// no way to reliably intercept the crash due to high resolution, so we simply avoid it
					if (this.width > Image.MAX_RESIZE_WIDTH || this.height > Image.MAX_RESIZE_HEIGHT) {
						throw new x.ImageError(x.ImageError.MAX_RESOLUTION_ERR);
					}

					if (!width && !height || Basic.typeOf(crop) === 'undefined') {
						crop = false;
					}

					width = width || this.width;
					height = height || this.height;

					preserveHeaders = (Basic.typeOf(preserveHeaders) === 'undefined' ? true : !!preserveHeaders);

					this.getRuntime().exec.call(this, 'Image', 'downsize', width, height, crop, preserveHeaders);
				} catch(ex) {
					// for now simply trigger error event
					this.trigger('error', ex);
				}
			},

			/**
			Alias for downsize(width, height, true). (see downsize)
			
			@method crop
			@param {Number} width Resulting width
			@param {Number} [height=width] Resulting height (optional, if not supplied will default to width)
			@param {Boolean} [preserveHeaders=true] Whether to preserve meta headers (on JPEGs after resize)
			*/
			crop: function(width, height, preserveHeaders) {
				this.downsize(width, height, true, preserveHeaders);
			},

			getAsCanvas: function() {
				if (!Env.can('create_canvas')) {
					throw new x.RuntimeError(x.RuntimeError.NOT_SUPPORTED_ERR);
				}

				var runtime = this.connectRuntime(this.ruid);
				return runtime.exec.call(this, 'Image', 'getAsCanvas');
			},

			/**
			Retrieves image in it's current state as mOxie.Blob object. Cannot be run on empty or image in progress (throws
			DOMException.INVALID_STATE_ERR).

			@method getAsBlob
			@param {String} [type="image/jpeg"] Mime type of resulting blob. Can either be image/jpeg or image/png
			@param {Number} [quality=90] Applicable only together with mime type image/jpeg
			@return {Blob} Image as Blob
			*/
			getAsBlob: function(type, quality) {
				if (!this.size) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				if (!type) {
					type = 'image/jpeg';
				}

				if (type === 'image/jpeg' && !quality) {
					quality = 90;
				}

				return this.getRuntime().exec.call(this, 'Image', 'getAsBlob', type, quality);
			},

			/**
			Retrieves image in it's current state as dataURL string. Cannot be run on empty or image in progress (throws
			DOMException.INVALID_STATE_ERR).

			@method getAsDataURL
			@param {String} [type="image/jpeg"] Mime type of resulting blob. Can either be image/jpeg or image/png
			@param {Number} [quality=90] Applicable only together with mime type image/jpeg
			@return {String} Image as dataURL string
			*/
			getAsDataURL: function(type, quality) {
				if (!this.size) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}
				return this.getRuntime().exec.call(this, 'Image', 'getAsDataURL', type, quality);
			},

			/**
			Retrieves image in it's current state as binary string. Cannot be run on empty or image in progress (throws
			DOMException.INVALID_STATE_ERR).

			@method getAsBinaryString
			@param {String} [type="image/jpeg"] Mime type of resulting blob. Can either be image/jpeg or image/png
			@param {Number} [quality=90] Applicable only together with mime type image/jpeg
			@return {String} Image as binary string
			*/
			getAsBinaryString: function(type, quality) {
				var dataUrl = this.getAsDataURL(type, quality);
				return Encode.atob(dataUrl.substring(dataUrl.indexOf('base64,') + 7));
			},

			/**
			Embeds the image, or better to say, it's visual representation into the specified node. Depending on the runtime
			in use, might be a canvas, or image (actual ) element or shim object (Flash or SilverLight - very rare, used for
			legacy browsers that do not have canvas or proper dataURI support).

			@method embed
			@param {DOMElement} el DOM element to insert the image object into
			@param {Object} options Set of key/value pairs controlling the mime type, dimensions and cropping factor of resulting
			representation
			*/
			embed: function(el) {
				var self = this
				, imgCopy
				, type, quality, crop
				, options = arguments[1] || {}
				, width = this.width
				, height = this.height
				, runtime // this has to be outside of all the closures to contain proper runtime
				;

				function onResize() {
					// if possible, embed a canvas element directly
					if (Env.can('create_canvas')) {
						var canvas = imgCopy.getAsCanvas();
						if (canvas) {
							el.appendChild(canvas);
							canvas = null;
							imgCopy.destroy();
							self.trigger('embedded');
							return;
						}
					}

					var dataUrl = imgCopy.getAsDataURL(type, quality);
					if (!dataUrl) {
						throw new x.ImageError(x.ImageError.WRONG_FORMAT);
					}

					if (Env.can('use_data_uri_of', dataUrl.length)) {
						el.innerHTML = '<img src="' + dataUrl + '" width="' + imgCopy.width + '" height="' + imgCopy.height + '" />';
						imgCopy.destroy();
						self.trigger('embedded');
					} else {
						var tr = new Transporter();

						tr.bind("TransportingComplete", function() {
							runtime = self.connectRuntime(this.result.ruid);

							self.bind("Embedded", function() {
								// position and size properly
								Basic.extend(runtime.getShimContainer().style, {
									//position: 'relative',
									top: '0px',
									left: '0px',
									width: imgCopy.width + 'px',
									height: imgCopy.height + 'px'
								});

								// some shims (Flash/SilverLight) reinitialize, if parent element is hidden, reordered or it's
								// position type changes (in Gecko), but since we basically need this only in IEs 6/7 and
								// sometimes 8 and they do not have this problem, we can comment this for now
								/*tr.bind("RuntimeInit", function(e, runtime) {
									tr.destroy();
									runtime.destroy();
									onResize.call(self); // re-feed our image data
								});*/

								runtime = null;
							}, 999);

							runtime.exec.call(self, "ImageView", "display", this.result.uid, width, height);
							imgCopy.destroy();
						});

						tr.transport(Encode.atob(dataUrl.substring(dataUrl.indexOf('base64,') + 7)), type, Basic.extend({}, options, {
							required_caps: {
								display_media: true
							},
							runtime_order: 'flash,silverlight',
							container: el
						}));
					}
				}

				try {
					if (!(el = Dom.get(el))) {
						throw new x.DOMException(x.DOMException.INVALID_NODE_TYPE_ERR);
					}

					if (!this.size) { // only preloaded image objects can be used as source
						throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
					}

					if (this.width > Image.MAX_RESIZE_WIDTH || this.height > Image.MAX_RESIZE_HEIGHT) {
						throw new x.ImageError(x.ImageError.MAX_RESOLUTION_ERR);
					}

					type = options.type || this.type || 'image/jpeg';
					quality = options.quality || 90;
					crop = Basic.typeOf(options.crop) !== 'undefined' ? options.crop : false;

					// figure out dimensions for the thumb
					if (options.width) {
						width = options.width;
						height = options.height || width;
					} else {
						// if container element has > 0 dimensions, take them
						var dimensions = Dom.getSize(el);
						if (dimensions.w && dimensions.h) { // both should be > 0
							width = dimensions.w;
							height = dimensions.h;
						}
					}

					imgCopy = new Image();

					imgCopy.bind("Resize", function() {
						onResize.call(self);
					});

					imgCopy.bind("Load", function() {
						imgCopy.downsize(width, height, crop, false);
					});

					imgCopy.clone(this, false);

					return imgCopy;
				} catch(ex) {
					// for now simply trigger error event
					this.trigger('error', ex);
				}
			},

			/**
			Properly destroys the image and frees resources in use. If any. Recommended way to dispose mOxie.Image object.

			@method destroy
			*/
			destroy: function() {
				if (this.ruid) {
					this.getRuntime().exec.call(this, 'Image', 'destroy');
					this.disconnectRuntime();
				}
				this.unbindAll();
			}
		});


		function _updateInfo(info) {
			if (!info) {
				info = this.getRuntime().exec.call(this, 'Image', 'getInfo');
			}

			this.size = info.size;
			this.width = info.width;
			this.height = info.height;
			this.type = info.type;
			this.meta = info.meta;

			// update file name, only if empty
			if (this.name === '') {
				this.name = info.name;
			}
		}
		

		function _load(src) {
			var srcType = Basic.typeOf(src);

			try {
				// if source is Image
				if (src instanceof Image) {
					if (!src.size) { // only preloaded image objects can be used as source
						throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
					}
					_loadFromImage.apply(this, arguments);
				}
				// if source is o.Blob/o.File
				else if (src instanceof Blob) {
					if (!~Basic.inArray(src.type, ['image/jpeg', 'image/png'])) {
						throw new x.ImageError(x.ImageError.WRONG_FORMAT);
					}
					_loadFromBlob.apply(this, arguments);
				}
				// if native blob/file
				else if (Basic.inArray(srcType, ['blob', 'file']) !== -1) {
					_load.call(this, new File(null, src), arguments[1]);
				}
				// if String
				else if (srcType === 'string') {
					// if dataUrl String
					if (/^data:[^;]*;base64,/.test(src)) {
						_load.call(this, new Blob(null, { data: src }), arguments[1]);
					}
					// else assume Url, either relative or absolute
					else {
						_loadFromUrl.apply(this, arguments);
					}
				}
				// if source seems to be an img node
				else if (srcType === 'node' && src.nodeName.toLowerCase() === 'img') {
					_load.call(this, src.src, arguments[1]);
				}
				else {
					throw new x.DOMException(x.DOMException.TYPE_MISMATCH_ERR);
				}
			} catch(ex) {
				// for now simply trigger error event
				this.trigger('error', ex);
			}
		}


		function _loadFromImage(img, exact) {
			var runtime = this.connectRuntime(img.ruid);
			this.ruid = runtime.uid;
			runtime.exec.call(this, 'Image', 'loadFromImage', img, (Basic.typeOf(exact) === 'undefined' ? true : exact));
		}


		function _loadFromBlob(blob, options) {
			var self = this;

			self.name = blob.name || '';

			function exec(runtime) {
				self.ruid = runtime.uid;
				runtime.exec.call(self, 'Image', 'loadFromBlob', blob);
			}

			if (blob.isDetached()) {
				this.bind('RuntimeInit', function(e, runtime) {
					exec(runtime);
				});

				// convert to object representation
				if (options && typeof(options.required_caps) === 'string') {
					options.required_caps = Runtime.parseCaps(options.required_caps);
				}

				this.connectRuntime(Basic.extend({
					required_caps: {
						access_image_binary: true,
						resize_image: true
					}
				}, options));
			} else {
				exec(this.connectRuntime(blob.ruid));
			}
		}


		function _loadFromUrl(url, options) {
			var self = this, xhr;

			xhr = new XMLHttpRequest();

			xhr.open('get', url);
			xhr.responseType = 'blob';

			xhr.onprogress = function(e) {
				self.trigger(e);
			};

			xhr.onload = function() {
				_loadFromBlob.call(self, xhr.response, true);
			};

			xhr.onerror = function(e) {
				self.trigger(e);
			};

			xhr.onloadend = function() {
				xhr.destroy();
			};

			xhr.bind('RuntimeError', function(e, err) {
				self.trigger('RuntimeError', err);
			});

			xhr.send(null, options);
		}
	}

	// virtual world will crash on you if image has a resolution higher than this:
	Image.MAX_RESIZE_WIDTH = 6500;
	Image.MAX_RESIZE_HEIGHT = 6500; 

	Image.prototype = EventTarget.instance;

	return Image;
});

// Included from: src/javascript/runtime/html5/Runtime.js

/**
 * Runtime.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/*global File:true */

/**
Defines constructor for HTML5 runtime.

@class moxie/runtime/html5/Runtime
@private
*/
define("moxie/runtime/html5/Runtime", [
	"moxie/core/utils/Basic",
	"moxie/core/Exceptions",
	"moxie/runtime/Runtime",
	"moxie/core/utils/Env"
], function(Basic, x, Runtime, Env) {
	
	var type = "html5", extensions = {};
	
	function Html5Runtime(options) {
		var I = this
		, Test = Runtime.capTest
		, True = Runtime.capTrue
		;

		var caps = Basic.extend({
				access_binary: Test(window.FileReader || window.File && window.File.getAsDataURL),
				access_image_binary: function() {
					return I.can('access_binary') && !!extensions.Image;
				},
				display_media: Test(Env.can('create_canvas') || Env.can('use_data_uri_over32kb')),
				do_cors: Test(window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest()),
				drag_and_drop: Test(function() {
					// this comes directly from Modernizr: http://www.modernizr.com/
					var div = document.createElement('div');
					// IE has support for drag and drop since version 5, but doesn't support dropping files from desktop
					return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div)) && (Env.browser !== 'IE' || Env.version > 9);
				}()),
				filter_by_extension: Test(function() { // if you know how to feature-detect this, please suggest
					return (Env.browser === 'Chrome' && Env.version >= 28) || (Env.browser === 'IE' && Env.version >= 10);
				}()),
				return_response_headers: True,
				return_response_type: function(responseType) {
					if (responseType === 'json' && !!window.JSON) { // we can fake this one even if it's not supported
						return true;
					} 
					return Env.can('return_response_type', responseType);
				},
				return_status_code: True,
				report_upload_progress: Test(window.XMLHttpRequest && new XMLHttpRequest().upload),
				resize_image: function() {
					return I.can('access_binary') && Env.can('create_canvas');
				},
				select_file: function() {
					return Env.can('use_fileinput') && window.File;
				},
				select_folder: function() {
					return I.can('select_file') && Env.browser === 'Chrome' && Env.version >= 21;
				},
				select_multiple: function() {
					// it is buggy on Safari Windows and iOS
					return I.can('select_file') && 
						!(Env.browser === 'Safari' && Env.os === 'Windows') && 
						!(Env.os === 'iOS' && Env.verComp(Env.osVersion, "7.0.4", '<'));
				},
				send_binary_string: Test(window.XMLHttpRequest && (new XMLHttpRequest().sendAsBinary || (window.Uint8Array && window.ArrayBuffer))),
				send_custom_headers: Test(window.XMLHttpRequest),
				send_multipart: function() {
					return !!(window.XMLHttpRequest && new XMLHttpRequest().upload && window.FormData) || I.can('send_binary_string');
				},
				slice_blob: Test(window.File && (File.prototype.mozSlice || File.prototype.webkitSlice || File.prototype.slice)),
				stream_upload: function(){
					return I.can('slice_blob') && I.can('send_multipart');
				},
				summon_file_dialog: Test(function() { // yeah... some dirty sniffing here...
					return (Env.browser === 'Firefox' && Env.version >= 4) ||
						(Env.browser === 'Opera' && Env.version >= 12) ||
						(Env.browser === 'IE' && Env.version >= 10) ||
						!!~Basic.inArray(Env.browser, ['Chrome', 'Safari']);
				}()),
				upload_filesize: True
			}, 
			arguments[2]
		);

		Runtime.call(this, options, (arguments[1] || type), caps);


		Basic.extend(this, {

			init : function() {
				this.trigger("Init");
			},

			destroy: (function(destroy) { // extend default destroy method
				return function() {
					destroy.call(I);
					destroy = I = null;
				};
			}(this.destroy))
		});

		Basic.extend(this.getShim(), extensions);
	}

	Runtime.addConstructor(type, Html5Runtime);

	return extensions;
});

// Included from: src/javascript/runtime/html5/file/Blob.js

/**
 * Blob.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/html5/file/Blob
@private
*/
define("moxie/runtime/html5/file/Blob", [
	"moxie/runtime/html5/Runtime",
	"moxie/file/Blob"
], function(extensions, Blob) {

	function HTML5Blob() {
		function w3cBlobSlice(blob, start, end) {
			var blobSlice;

			if (window.File.prototype.slice) {
				try {
					blob.slice();	// depricated version will throw WRONG_ARGUMENTS_ERR exception
					return blob.slice(start, end);
				} catch (e) {
					// depricated slice method
					return blob.slice(start, end - start);
				}
			// slice method got prefixed: https://bugzilla.mozilla.org/show_bug.cgi?id=649672
			} else if ((blobSlice = window.File.prototype.webkitSlice || window.File.prototype.mozSlice)) {
				return blobSlice.call(blob, start, end);
			} else {
				return null; // or throw some exception
			}
		}

		this.slice = function() {
			return new Blob(this.getRuntime().uid, w3cBlobSlice.apply(this, arguments));
		};
	}

	return (extensions.Blob = HTML5Blob);
});

// Included from: src/javascript/core/utils/Events.js

/**
 * Events.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/core/utils/Events', [
	'moxie/core/utils/Basic'
], function(Basic) {
	var eventhash = {}, uid = 'moxie_' + Basic.guid();
	
	// IE W3C like event funcs
	function preventDefault() {
		this.returnValue = false;
	}

	function stopPropagation() {
		this.cancelBubble = true;
	}

	/**
	Adds an event handler to the specified object and store reference to the handler
	in objects internal Plupload registry (@see removeEvent).
	
	@method addEvent
	@for Utils
	@static
	@param {Object} obj DOM element like object to add handler to.
	@param {String} name Name to add event listener to.
	@param {Function} callback Function to call when event occurs.
	@param {String} [key] that might be used to add specifity to the event record.
	*/
	var addEvent = function(obj, name, callback, key) {
		var func, events;
					
		name = name.toLowerCase();

		// Add event listener
		if (obj.addEventListener) {
			func = callback;
			
			obj.addEventListener(name, func, false);
		} else if (obj.attachEvent) {
			func = function() {
				var evt = window.event;

				if (!evt.target) {
					evt.target = evt.srcElement;
				}

				evt.preventDefault = preventDefault;
				evt.stopPropagation = stopPropagation;

				callback(evt);
			};

			obj.attachEvent('on' + name, func);
		}
		
		// Log event handler to objects internal mOxie registry
		if (!obj[uid]) {
			obj[uid] = Basic.guid();
		}
		
		if (!eventhash.hasOwnProperty(obj[uid])) {
			eventhash[obj[uid]] = {};
		}
		
		events = eventhash[obj[uid]];
		
		if (!events.hasOwnProperty(name)) {
			events[name] = [];
		}
				
		events[name].push({
			func: func,
			orig: callback, // store original callback for IE
			key: key
		});
	};
	
	
	/**
	Remove event handler from the specified object. If third argument (callback)
	is not specified remove all events with the specified name.
	
	@method removeEvent
	@static
	@param {Object} obj DOM element to remove event listener(s) from.
	@param {String} name Name of event listener to remove.
	@param {Function|String} [callback] might be a callback or unique key to match.
	*/
	var removeEvent = function(obj, name, callback) {
		var type, undef;
		
		name = name.toLowerCase();
		
		if (obj[uid] && eventhash[obj[uid]] && eventhash[obj[uid]][name]) {
			type = eventhash[obj[uid]][name];
		} else {
			return;
		}
			
		for (var i = type.length - 1; i >= 0; i--) {
			// undefined or not, key should match
			if (type[i].orig === callback || type[i].key === callback) {
				if (obj.removeEventListener) {
					obj.removeEventListener(name, type[i].func, false);
				} else if (obj.detachEvent) {
					obj.detachEvent('on'+name, type[i].func);
				}
				
				type[i].orig = null;
				type[i].func = null;
				type.splice(i, 1);
				
				// If callback was passed we are done here, otherwise proceed
				if (callback !== undef) {
					break;
				}
			}
		}
		
		// If event array got empty, remove it
		if (!type.length) {
			delete eventhash[obj[uid]][name];
		}
		
		// If mOxie registry has become empty, remove it
		if (Basic.isEmptyObj(eventhash[obj[uid]])) {
			delete eventhash[obj[uid]];
			
			// IE doesn't let you remove DOM object property with - delete
			try {
				delete obj[uid];
			} catch(e) {
				obj[uid] = undef;
			}
		}
	};
	
	
	/**
	Remove all kind of events from the specified object
	
	@method removeAllEvents
	@static
	@param {Object} obj DOM element to remove event listeners from.
	@param {String} [key] unique key to match, when removing events.
	*/
	var removeAllEvents = function(obj, key) {		
		if (!obj || !obj[uid]) {
			return;
		}
		
		Basic.each(eventhash[obj[uid]], function(events, name) {
			removeEvent(obj, name, key);
		});
	};

	return {
		addEvent: addEvent,
		removeEvent: removeEvent,
		removeAllEvents: removeAllEvents
	};
});

// Included from: src/javascript/runtime/html5/file/FileInput.js

/**
 * FileInput.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/html5/file/FileInput
@private
*/
define("moxie/runtime/html5/file/FileInput", [
	"moxie/runtime/html5/Runtime",
	"moxie/core/utils/Basic",
	"moxie/core/utils/Dom",
	"moxie/core/utils/Events",
	"moxie/core/utils/Mime",
	"moxie/core/utils/Env"
], function(extensions, Basic, Dom, Events, Mime, Env) {
	
	function FileInput() {
		var _files = [], _options;

		Basic.extend(this, {
			init: function(options) {
				var comp = this, I = comp.getRuntime(), input, shimContainer, mimes, browseButton, zIndex, top;

				_options = options;
				_files = [];

				// figure out accept string
				mimes = _options.accept.mimes || Mime.extList2mimes(_options.accept, I.can('filter_by_extension'));

				shimContainer = I.getShimContainer();

				shimContainer.innerHTML = '<input id="' + I.uid +'" type="file" style="font-size:999px;opacity:0;"' +
					(_options.multiple && I.can('select_multiple') ? 'multiple' : '') + 
					(_options.directory && I.can('select_folder') ? 'webkitdirectory directory' : '') + // Chrome 11+
					(mimes ? ' accept="' + mimes.join(',') + '"' : '') + ' />';

				input = Dom.get(I.uid);

				// prepare file input to be placed underneath the browse_button element
				Basic.extend(input.style, {
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%'
				});


				browseButton = Dom.get(_options.browse_button);

				// Route click event to the input[type=file] element for browsers that support such behavior
				if (I.can('summon_file_dialog')) {
					if (Dom.getStyle(browseButton, 'position') === 'static') {
						browseButton.style.position = 'relative';
					}

					zIndex = parseInt(Dom.getStyle(browseButton, 'z-index'), 10) || 1;

					browseButton.style.zIndex = zIndex;
					shimContainer.style.zIndex = zIndex - 1;

					Events.addEvent(browseButton, 'click', function(e) {
						var input = Dom.get(I.uid);
						if (input && !input.disabled) { // for some reason FF (up to 8.0.1 so far) lets to click disabled input[type=file]
							input.click();
						}
						e.preventDefault();
					}, comp.uid);
				}

				/* Since we have to place input[type=file] on top of the browse_button for some browsers,
				browse_button loses interactivity, so we restore it here */
				top = I.can('summon_file_dialog') ? browseButton : shimContainer;

				Events.addEvent(top, 'mouseover', function() {
					comp.trigger('mouseenter');
				}, comp.uid);

				Events.addEvent(top, 'mouseout', function() {
					comp.trigger('mouseleave');
				}, comp.uid);

				Events.addEvent(top, 'mousedown', function() {
					comp.trigger('mousedown');
				}, comp.uid);

				Events.addEvent(Dom.get(_options.container), 'mouseup', function() {
					comp.trigger('mouseup');
				}, comp.uid);


				input.onchange = function onChange() { // there should be only one handler for this
					_files = [];

					if (_options.directory) {
						// folders are represented by dots, filter them out (Chrome 11+)
						Basic.each(this.files, function(file) {
							if (file.name !== ".") { // if it doesn't looks like a folder
								_files.push(file);
							}
						});
					} else {
						_files = [].slice.call(this.files);
					}

					// clearing the value enables the user to select the same file again if they want to
					if (Env.browser !== 'IE') {
						this.value = '';
					} else {
						// in IE input[type="file"] is read-only so the only way to reset it is to re-insert it
						var clone = this.cloneNode(true);
						this.parentNode.replaceChild(clone, this);
						clone.onchange = onChange;
					}
					comp.trigger('change');
				};

				// ready event is perfectly asynchronous
				comp.trigger({
					type: 'ready',
					async: true
				});

				shimContainer = null;
			},

			getFiles: function() {
				return _files;
			},

			disable: function(state) {
				var I = this.getRuntime(), input;

				if ((input = Dom.get(I.uid))) {
					input.disabled = !!state;
				}
			},

			destroy: function() {
				var I = this.getRuntime()
				, shim = I.getShim()
				, shimContainer = I.getShimContainer()
				;
				
				Events.removeAllEvents(shimContainer, this.uid);
				Events.removeAllEvents(_options && Dom.get(_options.container), this.uid);
				Events.removeAllEvents(_options && Dom.get(_options.browse_button), this.uid);
				
				if (shimContainer) {
					shimContainer.innerHTML = '';
				}

				shim.removeInstance(this.uid);

				_files = _options = shimContainer = shim = null;
			}
		});
	}

	return (extensions.FileInput = FileInput);
});

// Included from: src/javascript/runtime/html5/file/FileDrop.js

/**
 * FileDrop.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/html5/file/FileDrop
@private
*/
define("moxie/runtime/html5/file/FileDrop", [
	"moxie/runtime/html5/Runtime",
	"moxie/core/utils/Basic",
	"moxie/core/utils/Dom",
	"moxie/core/utils/Events",
	"moxie/core/utils/Mime"
], function(extensions, Basic, Dom, Events, Mime) {
	
	function FileDrop() {
		var _files = [], _allowedExts = [], _options;

		Basic.extend(this, {
			init: function(options) {
				var comp = this, dropZone;

				_options = options;
				_allowedExts = _extractExts(_options.accept);
				dropZone = _options.container;

				Events.addEvent(dropZone, 'dragover', function(e) {
					e.preventDefault();
					e.stopPropagation();
					e.dataTransfer.dropEffect = 'copy';
				}, comp.uid);

				Events.addEvent(dropZone, 'drop', function(e) {
					e.preventDefault();
					e.stopPropagation();

					_files = [];

					// Chrome 21+ accepts folders via Drag'n'Drop
					if (e.dataTransfer.items && e.dataTransfer.items[0].webkitGetAsEntry) {
						_readItems(e.dataTransfer.items, function() {
							comp.trigger("drop");
						});
					} else {
						Basic.each(e.dataTransfer.files, function(file) {
							if (_isAcceptable(file)) {
								_files.push(file);
							}
						});
						comp.trigger("drop");
					}
				}, comp.uid);

				Events.addEvent(dropZone, 'dragenter', function(e) {
					e.preventDefault();
					e.stopPropagation();
					comp.trigger("dragenter");
				}, comp.uid);

				Events.addEvent(dropZone, 'dragleave', function(e) {
					e.preventDefault();
					e.stopPropagation();
					comp.trigger("dragleave");
				}, comp.uid);
			},

			getFiles: function() {
				return _files;
			},

			destroy: function() {
				Events.removeAllEvents(_options && Dom.get(_options.container), this.uid);
				_files = _allowedExts = _options = null;
			}
		});

		
		function _extractExts(accept) {
			var exts = [];
			for (var i = 0; i < accept.length; i++) {
				[].push.apply(exts, accept[i].extensions.split(/\s*,\s*/));
			}
			return Basic.inArray('*', exts) === -1 ? exts : [];
		}


		function _isAcceptable(file) {
			var ext = Mime.getFileExtension(file.name);
			return !ext || !_allowedExts.length || Basic.inArray(ext, _allowedExts) !== -1;
		}


		function _readItems(items, cb) {
			var entries = [];
			Basic.each(items, function(item) {
				var entry = item.webkitGetAsEntry();
				// Address #998 (https://code.google.com/p/chromium/issues/detail?id=332579)
				if (entry) {
					// file() fails on OSX when the filename contains a special character (e.g. umlaut): see #61
					if (entry.isFile) {
						var file = item.getAsFile();
						if (_isAcceptable(file)) {
							_files.push(file);
						}
					} else {
						entries.push(entry);
					}
				}
			});

			if (entries.length) {
				_readEntries(entries, cb);
			} else {
				cb();
			}
		}


		function _readEntries(entries, cb) {
			var queue = [];
			Basic.each(entries, function(entry) {
				queue.push(function(cbcb) {
					_readEntry(entry, cbcb);
				});
			});
			Basic.inSeries(queue, function() {
				cb();
			});
		}

		function _readEntry(entry, cb) {
			if (entry.isFile) {
				entry.file(function(file) {
					if (_isAcceptable(file)) {
						_files.push(file);
					}
					cb();
				}, function() {
					// fire an error event maybe
					cb();
				});
			} else if (entry.isDirectory) {
				_readDirEntry(entry, cb);
			} else {
				cb(); // not file, not directory? what then?..
			}
		}

		function _readDirEntry(dirEntry, cb) {
			var entries = [], dirReader = dirEntry.createReader();

			// keep quering recursively till no more entries
			function getEntries(cbcb) {
				dirReader.readEntries(function(moreEntries) {
					if (moreEntries.length) {
						[].push.apply(entries, moreEntries);
						getEntries(cbcb);
					} else {
						cbcb();
					}
				}, cbcb);
			}

			// ...and you thought FileReader was crazy...
			getEntries(function() {
				_readEntries(entries, cb);
			}); 
		}
	}

	return (extensions.FileDrop = FileDrop);
});

// Included from: src/javascript/runtime/html5/file/FileReader.js

/**
 * FileReader.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/html5/file/FileReader
@private
*/
define("moxie/runtime/html5/file/FileReader", [
	"moxie/runtime/html5/Runtime",
	"moxie/core/utils/Encode",
	"moxie/core/utils/Basic"
], function(extensions, Encode, Basic) {
	
	function FileReader() {
		var _fr, _convertToBinary = false;

		Basic.extend(this, {

			read: function(op, blob) {
				var target = this;

				_fr = new window.FileReader();

				_fr.addEventListener('progress', function(e) {
					target.trigger(e);
				});

				_fr.addEventListener('load', function(e) {
					target.trigger(e);
				});

				_fr.addEventListener('error', function(e) {
					target.trigger(e, _fr.error);
				});

				_fr.addEventListener('loadend', function() {
					_fr = null;
				});

				if (Basic.typeOf(_fr[op]) === 'function') {
					_convertToBinary = false;
					_fr[op](blob.getSource());
				} else if (op === 'readAsBinaryString') { // readAsBinaryString is depricated in general and never existed in IE10+
					_convertToBinary = true;
					_fr.readAsDataURL(blob.getSource());
				}
			},

			getResult: function() {
				return _fr && _fr.result ? (_convertToBinary ? _toBinary(_fr.result) : _fr.result) : null;
			},

			abort: function() {
				if (_fr) {
					_fr.abort();
				}
			},

			destroy: function() {
				_fr = null;
			}
		});

		function _toBinary(str) {
			return Encode.atob(str.substring(str.indexOf('base64,') + 7));
		}
	}

	return (extensions.FileReader = FileReader);
});

// Included from: src/javascript/runtime/html5/xhr/XMLHttpRequest.js

/**
 * XMLHttpRequest.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/*global ActiveXObject:true */

/**
@class moxie/runtime/html5/xhr/XMLHttpRequest
@private
*/
define("moxie/runtime/html5/xhr/XMLHttpRequest", [
	"moxie/runtime/html5/Runtime",
	"moxie/core/utils/Basic",
	"moxie/core/utils/Mime",
	"moxie/core/utils/Url",
	"moxie/file/File",
	"moxie/file/Blob",
	"moxie/xhr/FormData",
	"moxie/core/Exceptions",
	"moxie/core/utils/Env"
], function(extensions, Basic, Mime, Url, File, Blob, FormData, x, Env) {
	
	function XMLHttpRequest() {
		var self = this
		, _xhr
		, _filename
		;

		Basic.extend(this, {
			send: function(meta, data) {
				var target = this
				, isGecko2_5_6 = (Env.browser === 'Mozilla' && Env.version >= 4 && Env.version < 7)
				, isAndroidBrowser = Env.browser === 'Android Browser'
				, mustSendAsBinary = false
				;

				// extract file name
				_filename = meta.url.replace(/^.+?\/([\w\-\.]+)$/, '$1').toLowerCase();

				_xhr = _getNativeXHR();
				_xhr.open(meta.method, meta.url, meta.async, meta.user, meta.password);


				// prepare data to be sent
				if (data instanceof Blob) {
					if (data.isDetached()) {
						mustSendAsBinary = true;
					}
					data = data.getSource();
				} else if (data instanceof FormData) {

					if (data.hasBlob()) {
						if (data.getBlob().isDetached()) {
							data = _prepareMultipart.call(target, data); // _xhr must be instantiated and be in OPENED state
							mustSendAsBinary = true;
						} else if ((isGecko2_5_6 || isAndroidBrowser) && Basic.typeOf(data.getBlob().getSource()) === 'blob' && window.FileReader) {
							// Gecko 2/5/6 can't send blob in FormData: https://bugzilla.mozilla.org/show_bug.cgi?id=649150
							// Android browsers (default one and Dolphin) seem to have the same issue, see: #613
							_preloadAndSend.call(target, meta, data);
							return; // _preloadAndSend will reinvoke send() with transmutated FormData =%D
						}	
					}

					// transfer fields to real FormData
					if (data instanceof FormData) { // if still a FormData, e.g. not mangled by _prepareMultipart()
						var fd = new window.FormData();
						data.each(function(value, name) {
							if (value instanceof Blob) {
								fd.append(name, value.getSource());
							} else {
								fd.append(name, value);
							}
						});
						data = fd;
					}
				}


				// if XHR L2
				if (_xhr.upload) {
					if (meta.withCredentials) {
						_xhr.withCredentials = true;
					}

					_xhr.addEventListener('load', function(e) {
						target.trigger(e);
					});

					_xhr.addEventListener('error', function(e) {
						target.trigger(e);
					});

					// additionally listen to progress events
					_xhr.addEventListener('progress', function(e) {
						target.trigger(e);
					});

					_xhr.upload.addEventListener('progress', function(e) {
						target.trigger({
							type: 'UploadProgress',
							loaded: e.loaded,
							total: e.total
						});
					});
				// ... otherwise simulate XHR L2
				} else {
					_xhr.onreadystatechange = function onReadyStateChange() {
						
						// fake Level 2 events
						switch (_xhr.readyState) {
							
							case 1: // XMLHttpRequest.OPENED
								// readystatechanged is fired twice for OPENED state (in IE and Mozilla) - neu
								break;
							
							// looks like HEADERS_RECEIVED (state 2) is not reported in Opera (or it's old versions) - neu
							case 2: // XMLHttpRequest.HEADERS_RECEIVED
								break;
								
							case 3: // XMLHttpRequest.LOADING 
								// try to fire progress event for not XHR L2
								var total, loaded;
								
								try {
									if (Url.hasSameOrigin(meta.url)) { // Content-Length not accessible for cross-domain on some browsers
										total = _xhr.getResponseHeader('Content-Length') || 0; // old Safari throws an exception here
									}

									if (_xhr.responseText) { // responseText was introduced in IE7
										loaded = _xhr.responseText.length;
									}
								} catch(ex) {
									total = loaded = 0;
								}

								target.trigger({
									type: 'progress',
									lengthComputable: !!total,
									total: parseInt(total, 10),
									loaded: loaded
								});
								break;
								
							case 4: // XMLHttpRequest.DONE
								// release readystatechange handler (mostly for IE)
								_xhr.onreadystatechange = function() {};

								// usually status 0 is returned when server is unreachable, but FF also fails to status 0 for 408 timeout
								if (_xhr.status === 0) {
									target.trigger('error');
								} else {
									target.trigger('load');
								}							
								break;
						}
					};
				}
				

				// set request headers
				if (!Basic.isEmptyObj(meta.headers)) {
					Basic.each(meta.headers, function(value, header) {
						_xhr.setRequestHeader(header, value);
					});
				}

				// request response type
				if ("" !== meta.responseType && 'responseType' in _xhr) {
					if ('json' === meta.responseType && !Env.can('return_response_type', 'json')) { // we can fake this one
						_xhr.responseType = 'text';
					} else {
						_xhr.responseType = meta.responseType;
					}
				}

				// send ...
				if (!mustSendAsBinary) {
					_xhr.send(data);
				} else {
					if (_xhr.sendAsBinary) { // Gecko
						_xhr.sendAsBinary(data);
					} else { // other browsers having support for typed arrays
						(function() {
							// mimic Gecko's sendAsBinary
							var ui8a = new Uint8Array(data.length);
							for (var i = 0; i < data.length; i++) {
								ui8a[i] = (data.charCodeAt(i) & 0xff);
							}
							_xhr.send(ui8a.buffer);
						}());
					}
				}

				target.trigger('loadstart');
			},

			getStatus: function() {
				// according to W3C spec it should return 0 for readyState < 3, but instead it throws an exception
				try {
					if (_xhr) {
						return _xhr.status;
					}
				} catch(ex) {}
				return 0;
			},

			getResponse: function(responseType) {
				var I = this.getRuntime();

				try {
					switch (responseType) {
						case 'blob':
							var file = new File(I.uid, _xhr.response);
							
							// try to extract file name from content-disposition if possible (might be - not, if CORS for example)	
							var disposition = _xhr.getResponseHeader('Content-Disposition');
							if (disposition) {
								// extract filename from response header if available
								var match = disposition.match(/filename=([\'\"'])([^\1]+)\1/);
								if (match) {
									_filename = match[2];
								}
							}
							file.name = _filename;

							// pre-webkit Opera doesn't set type property on the blob response
							if (!file.type) {
								file.type = Mime.getFileMime(_filename);
							}
							return file;

						case 'json':
							if (!Env.can('return_response_type', 'json')) {
								return _xhr.status === 200 && !!window.JSON ? JSON.parse(_xhr.responseText) : null;
							}
							return _xhr.response;

						case 'document':
							return _getDocument(_xhr);

						default:
							return _xhr.responseText !== '' ? _xhr.responseText : null; // against the specs, but for consistency across the runtimes
					}
				} catch(ex) {
					return null;
				}				
			},

			getAllResponseHeaders: function() {
				try {
					return _xhr.getAllResponseHeaders();
				} catch(ex) {}
				return '';
			},

			abort: function() {
				if (_xhr) {
					_xhr.abort();
				}
			},

			destroy: function() {
				self = _filename = null;
			}
		});


		// here we go... ugly fix for ugly bug
		function _preloadAndSend(meta, data) {
			var target = this, blob, fr;
				
			// get original blob
			blob = data.getBlob().getSource();
			
			// preload blob in memory to be sent as binary string
			fr = new window.FileReader();
			fr.onload = function() {
				// overwrite original blob
				data.append(data.getBlobName(), new Blob(null, {
					type: blob.type,
					data: fr.result
				}));
				// invoke send operation again
				self.send.call(target, meta, data);
			};
			fr.readAsBinaryString(blob);
		}

		
		function _getNativeXHR() {
			if (window.XMLHttpRequest && !(Env.browser === 'IE' && Env.version < 8)) { // IE7 has native XHR but it's buggy
				return new window.XMLHttpRequest();
			} else {
				return (function() {
					var progIDs = ['Msxml2.XMLHTTP.6.0', 'Microsoft.XMLHTTP']; // if 6.0 available, use it, otherwise failback to default 3.0
					for (var i = 0; i < progIDs.length; i++) {
						try {
							return new ActiveXObject(progIDs[i]);
						} catch (ex) {}
					}
				})();
			}
		}
		
		// @credits Sergey Ilinsky	(http://www.ilinsky.com/)
		function _getDocument(xhr) {
			var rXML = xhr.responseXML;
			var rText = xhr.responseText;
			
			// Try parsing responseText (@see: http://www.ilinsky.com/articles/XMLHttpRequest/#bugs-ie-responseXML-content-type)
			if (Env.browser === 'IE' && rText && rXML && !rXML.documentElement && /[^\/]+\/[^\+]+\+xml/.test(xhr.getResponseHeader("Content-Type"))) {
				rXML = new window.ActiveXObject("Microsoft.XMLDOM");
				rXML.async = false;
				rXML.validateOnParse = false;
				rXML.loadXML(rText);
			}
	
			// Check if there is no error in document
			if (rXML) {
				if ((Env.browser === 'IE' && rXML.parseError !== 0) || !rXML.documentElement || rXML.documentElement.tagName === "parsererror") {
					return null;
				}
			}
			return rXML;
		}


		function _prepareMultipart(fd) {
			var boundary = '----moxieboundary' + new Date().getTime()
			, dashdash = '--'
			, crlf = '\r\n'
			, multipart = ''
			, I = this.getRuntime()
			;

			if (!I.can('send_binary_string')) {
				throw new x.RuntimeError(x.RuntimeError.NOT_SUPPORTED_ERR);
			}

			_xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + boundary);

			// append multipart parameters
			fd.each(function(value, name) {
				// Firefox 3.6 failed to convert multibyte characters to UTF-8 in sendAsBinary(), 
				// so we try it here ourselves with: unescape(encodeURIComponent(value))
				if (value instanceof Blob) {
					// Build RFC2388 blob
					multipart += dashdash + boundary + crlf +
						'Content-Disposition: form-data; name="' + name + '"; filename="' + unescape(encodeURIComponent(value.name || 'blob')) + '"' + crlf +
						'Content-Type: ' + (value.type || 'application/octet-stream') + crlf + crlf +
						value.getSource() + crlf;
				} else {
					multipart += dashdash + boundary + crlf +
						'Content-Disposition: form-data; name="' + name + '"' + crlf + crlf +
						unescape(encodeURIComponent(value)) + crlf;
				}
			});

			multipart += dashdash + boundary + dashdash + crlf;

			return multipart;
		}
	}

	return (extensions.XMLHttpRequest = XMLHttpRequest);
});

// Included from: src/javascript/runtime/html5/utils/BinaryReader.js

/**
 * BinaryReader.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/html5/utils/BinaryReader
@private
*/
define("moxie/runtime/html5/utils/BinaryReader", [], function() {
	return function() {
		var II = false, bin;

		// Private functions
		function read(idx, size) {
			var mv = II ? 0 : -8 * (size - 1), sum = 0, i;

			for (i = 0; i < size; i++) {
				sum |= (bin.charCodeAt(idx + i) << Math.abs(mv + i*8));
			}

			return sum;
		}

		function putstr(segment, idx, length) {
			length = arguments.length === 3 ? length : bin.length - idx - 1;
			bin = bin.substr(0, idx) + segment + bin.substr(length + idx);
		}

		function write(idx, num, size) {
			var str = '', mv = II ? 0 : -8 * (size - 1), i;

			for (i = 0; i < size; i++) {
				str += String.fromCharCode((num >> Math.abs(mv + i*8)) & 255);
			}

			putstr(str, idx, size);
		}

		// Public functions
		return {
			II: function(order) {
				if (order === undefined) {
					return II;
				} else {
					II = order;
				}
			},

			init: function(binData) {
				II = false;
				bin = binData;
			},

			SEGMENT: function(idx, length, segment) {
				switch (arguments.length) {
					case 1:
						return bin.substr(idx, bin.length - idx - 1);
					case 2:
						return bin.substr(idx, length);
					case 3:
						putstr(segment, idx, length);
						break;
					default: return bin;
				}
			},

			BYTE: function(idx) {
				return read(idx, 1);
			},

			SHORT: function(idx) {
				return read(idx, 2);
			},

			LONG: function(idx, num) {
				if (num === undefined) {
					return read(idx, 4);
				} else {
					write(idx, num, 4);
				}
			},

			SLONG: function(idx) { // 2's complement notation
				var num = read(idx, 4);

				return (num > 2147483647 ? num - 4294967296 : num);
			},

			STRING: function(idx, size) {
				var str = '';

				for (size += idx; idx < size; idx++) {
					str += String.fromCharCode(read(idx, 1));
				}

				return str;
			}
		};
	};
});

// Included from: src/javascript/runtime/html5/image/JPEGHeaders.js

/**
 * JPEGHeaders.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */
 
/**
@class moxie/runtime/html5/image/JPEGHeaders
@private
*/
define("moxie/runtime/html5/image/JPEGHeaders", [
	"moxie/runtime/html5/utils/BinaryReader"
], function(BinaryReader) {
	
	return function JPEGHeaders(data) {
		var headers = [], read, idx, marker, length = 0;

		read = new BinaryReader();
		read.init(data);

		// Check if data is jpeg
		if (read.SHORT(0) !== 0xFFD8) {
			return;
		}

		idx = 2;

		while (idx <= data.length) {
			marker = read.SHORT(idx);

			// omit RST (restart) markers
			if (marker >= 0xFFD0 && marker <= 0xFFD7) {
				idx += 2;
				continue;
			}

			// no headers allowed after SOS marker
			if (marker === 0xFFDA || marker === 0xFFD9) {
				break;
			}

			length = read.SHORT(idx + 2) + 2;

			// APPn marker detected
			if (marker >= 0xFFE1 && marker <= 0xFFEF) {
				headers.push({
					hex: marker,
					name: 'APP' + (marker & 0x000F),
					start: idx,
					length: length,
					segment: read.SEGMENT(idx, length)
				});
			}

			idx += length;
		}

		read.init(null); // free memory

		return {
			headers: headers,

			restore: function(data) {
				var max, i;

				read.init(data);

				idx = read.SHORT(2) == 0xFFE0 ? 4 + read.SHORT(4) : 2;

				for (i = 0, max = headers.length; i < max; i++) {
					read.SEGMENT(idx, 0, headers[i].segment);
					idx += headers[i].length;
				}

				data = read.SEGMENT();
				read.init(null);
				return data;
			},

			strip: function(data) {
				var headers, jpegHeaders, i;

				jpegHeaders = new JPEGHeaders(data);
				headers = jpegHeaders.headers;
				jpegHeaders.purge();

				read.init(data);

				i = headers.length;
				while (i--) {
					read.SEGMENT(headers[i].start, headers[i].length, '');
				}
				
				data = read.SEGMENT();
				read.init(null);
				return data;
			},

			get: function(name) {
				var array = [];

				for (var i = 0, max = headers.length; i < max; i++) {
					if (headers[i].name === name.toUpperCase()) {
						array.push(headers[i].segment);
					}
				}
				return array;
			},

			set: function(name, segment) {
				var array = [], i, ii, max;

				if (typeof(segment) === 'string') {
					array.push(segment);
				} else {
					array = segment;
				}

				for (i = ii = 0, max = headers.length; i < max; i++) {
					if (headers[i].name === name.toUpperCase()) {
						headers[i].segment = array[ii];
						headers[i].length = array[ii].length;
						ii++;
					}
					if (ii >= array.length) {
						break;
					}
				}
			},

			purge: function() {
				headers = [];
				read.init(null);
				read = null;
			}
		};
	};
});

// Included from: src/javascript/runtime/html5/image/ExifParser.js

/**
 * ExifParser.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/html5/image/ExifParser
@private
*/
define("moxie/runtime/html5/image/ExifParser", [
	"moxie/core/utils/Basic",
	"moxie/runtime/html5/utils/BinaryReader"
], function(Basic, BinaryReader) {
	
	return function ExifParser() {
		// Private ExifParser fields
		var data, tags, Tiff, offsets = {}, tagDescs;

		data = new BinaryReader();

		tags = {
			tiff : {
				/*
				The image orientation viewed in terms of rows and columns.

				1 = The 0th row is at the visual top of the image, and the 0th column is the visual left-hand side.
				2 = The 0th row is at the visual top of the image, and the 0th column is the visual right-hand side.
				3 = The 0th row is at the visual bottom of the image, and the 0th column is the visual right-hand side.
				4 = The 0th row is at the visual bottom of the image, and the 0th column is the visual left-hand side.
				5 = The 0th row is the visual left-hand side of the image, and the 0th column is the visual top.
				6 = The 0th row is the visual right-hand side of the image, and the 0th column is the visual top.
				7 = The 0th row is the visual right-hand side of the image, and the 0th column is the visual bottom.
				8 = The 0th row is the visual left-hand side of the image, and the 0th column is the visual bottom.
				*/
				0x0112: 'Orientation',
				0x010E: 'ImageDescription',
				0x010F: 'Make',
				0x0110: 'Model',
				0x0131: 'Software',
				0x8769: 'ExifIFDPointer',
				0x8825:	'GPSInfoIFDPointer'
			},
			exif : {
				0x9000: 'ExifVersion',
				0xA001: 'ColorSpace',
				0xA002: 'PixelXDimension',
				0xA003: 'PixelYDimension',
				0x9003: 'DateTimeOriginal',
				0x829A: 'ExposureTime',
				0x829D: 'FNumber',
				0x8827: 'ISOSpeedRatings',
				0x9201: 'ShutterSpeedValue',
				0x9202: 'ApertureValue'	,
				0x9207: 'MeteringMode',
				0x9208: 'LightSource',
				0x9209: 'Flash',
				0x920A: 'FocalLength',
				0xA402: 'ExposureMode',
				0xA403: 'WhiteBalance',
				0xA406: 'SceneCaptureType',
				0xA404: 'DigitalZoomRatio',
				0xA408: 'Contrast',
				0xA409: 'Saturation',
				0xA40A: 'Sharpness'
			},
			gps : {
				0x0000: 'GPSVersionID',
				0x0001: 'GPSLatitudeRef',
				0x0002: 'GPSLatitude',
				0x0003: 'GPSLongitudeRef',
				0x0004: 'GPSLongitude'
			}
		};

		tagDescs = {
			'ColorSpace': {
				1: 'sRGB',
				0: 'Uncalibrated'
			},

			'MeteringMode': {
				0: 'Unknown',
				1: 'Average',
				2: 'CenterWeightedAverage',
				3: 'Spot',
				4: 'MultiSpot',
				5: 'Pattern',
				6: 'Partial',
				255: 'Other'
			},

			'LightSource': {
				1: 'Daylight',
				2: 'Fliorescent',
				3: 'Tungsten',
				4: 'Flash',
				9: 'Fine weather',
				10: 'Cloudy weather',
				11: 'Shade',
				12: 'Daylight fluorescent (D 5700 - 7100K)',
				13: 'Day white fluorescent (N 4600 -5400K)',
				14: 'Cool white fluorescent (W 3900 - 4500K)',
				15: 'White fluorescent (WW 3200 - 3700K)',
				17: 'Standard light A',
				18: 'Standard light B',
				19: 'Standard light C',
				20: 'D55',
				21: 'D65',
				22: 'D75',
				23: 'D50',
				24: 'ISO studio tungsten',
				255: 'Other'
			},

			'Flash': {
				0x0000: 'Flash did not fire.',
				0x0001: 'Flash fired.',
				0x0005: 'Strobe return light not detected.',
				0x0007: 'Strobe return light detected.',
				0x0009: 'Flash fired, compulsory flash mode',
				0x000D: 'Flash fired, compulsory flash mode, return light not detected',
				0x000F: 'Flash fired, compulsory flash mode, return light detected',
				0x0010: 'Flash did not fire, compulsory flash mode',
				0x0018: 'Flash did not fire, auto mode',
				0x0019: 'Flash fired, auto mode',
				0x001D: 'Flash fired, auto mode, return light not detected',
				0x001F: 'Flash fired, auto mode, return light detected',
				0x0020: 'No flash function',
				0x0041: 'Flash fired, red-eye reduction mode',
				0x0045: 'Flash fired, red-eye reduction mode, return light not detected',
				0x0047: 'Flash fired, red-eye reduction mode, return light detected',
				0x0049: 'Flash fired, compulsory flash mode, red-eye reduction mode',
				0x004D: 'Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected',
				0x004F: 'Flash fired, compulsory flash mode, red-eye reduction mode, return light detected',
				0x0059: 'Flash fired, auto mode, red-eye reduction mode',
				0x005D: 'Flash fired, auto mode, return light not detected, red-eye reduction mode',
				0x005F: 'Flash fired, auto mode, return light detected, red-eye reduction mode'
			},

			'ExposureMode': {
				0: 'Auto exposure',
				1: 'Manual exposure',
				2: 'Auto bracket'
			},

			'WhiteBalance': {
				0: 'Auto white balance',
				1: 'Manual white balance'
			},

			'SceneCaptureType': {
				0: 'Standard',
				1: 'Landscape',
				2: 'Portrait',
				3: 'Night scene'
			},

			'Contrast': {
				0: 'Normal',
				1: 'Soft',
				2: 'Hard'
			},

			'Saturation': {
				0: 'Normal',
				1: 'Low saturation',
				2: 'High saturation'
			},

			'Sharpness': {
				0: 'Normal',
				1: 'Soft',
				2: 'Hard'
			},

			// GPS related
			'GPSLatitudeRef': {
				N: 'North latitude',
				S: 'South latitude'
			},

			'GPSLongitudeRef': {
				E: 'East longitude',
				W: 'West longitude'
			}
		};

		function extractTags(IFD_offset, tags2extract) {
			var length = data.SHORT(IFD_offset), i, ii,
				tag, type, count, tagOffset, offset, value, values = [], hash = {};

			for (i = 0; i < length; i++) {
				// Set binary reader pointer to beginning of the next tag
				offset = tagOffset = IFD_offset + 12 * i + 2;

				tag = tags2extract[data.SHORT(offset)];

				if (tag === undefined) {
					continue; // Not the tag we requested
				}

				type = data.SHORT(offset+=2);
				count = data.LONG(offset+=2);

				offset += 4;
				values = [];

				switch (type) {
					case 1: // BYTE
					case 7: // UNDEFINED
						if (count > 4) {
							offset = data.LONG(offset) + offsets.tiffHeader;
						}

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.BYTE(offset + ii);
						}

						break;

					case 2: // STRING
						if (count > 4) {
							offset = data.LONG(offset) + offsets.tiffHeader;
						}

						hash[tag] = data.STRING(offset, count - 1);

						continue;

					case 3: // SHORT
						if (count > 2) {
							offset = data.LONG(offset) + offsets.tiffHeader;
						}

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.SHORT(offset + ii*2);
						}

						break;

					case 4: // LONG
						if (count > 1) {
							offset = data.LONG(offset) + offsets.tiffHeader;
						}

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.LONG(offset + ii*4);
						}

						break;

					case 5: // RATIONAL
						offset = data.LONG(offset) + offsets.tiffHeader;

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.LONG(offset + ii*4) / data.LONG(offset + ii*4 + 4);
						}

						break;

					case 9: // SLONG
						offset = data.LONG(offset) + offsets.tiffHeader;

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.SLONG(offset + ii*4);
						}

						break;

					case 10: // SRATIONAL
						offset = data.LONG(offset) + offsets.tiffHeader;

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.SLONG(offset + ii*4) / data.SLONG(offset + ii*4 + 4);
						}

						break;

					default:
						continue;
				}

				value = (count == 1 ? values[0] : values);

				if (tagDescs.hasOwnProperty(tag) && typeof value != 'object') {
					hash[tag] = tagDescs[tag][value];
				} else {
					hash[tag] = value;
				}
			}

			return hash;
		}

		function getIFDOffsets() {
			var idx = offsets.tiffHeader;

			// Set read order of multi-byte data
			data.II(data.SHORT(idx) == 0x4949);

			// Check if always present bytes are indeed present
			if (data.SHORT(idx+=2) !== 0x002A) {
				return false;
			}

			offsets.IFD0 = offsets.tiffHeader + data.LONG(idx += 2);
			Tiff = extractTags(offsets.IFD0, tags.tiff);

			if ('ExifIFDPointer' in Tiff) {
				offsets.exifIFD = offsets.tiffHeader + Tiff.ExifIFDPointer;
				delete Tiff.ExifIFDPointer;
			}

			if ('GPSInfoIFDPointer' in Tiff) {
				offsets.gpsIFD = offsets.tiffHeader + Tiff.GPSInfoIFDPointer;
				delete Tiff.GPSInfoIFDPointer;
			}
			return true;
		}

		// At the moment only setting of simple (LONG) values, that do not require offset recalculation, is supported
		function setTag(ifd, tag, value) {
			var offset, length, tagOffset, valueOffset = 0;

			// If tag name passed translate into hex key
			if (typeof(tag) === 'string') {
				var tmpTags = tags[ifd.toLowerCase()];
				for (var hex in tmpTags) {
					if (tmpTags[hex] === tag) {
						tag = hex;
						break;
					}
				}
			}
			offset = offsets[ifd.toLowerCase() + 'IFD'];
			length = data.SHORT(offset);

			for (var i = 0; i < length; i++) {
				tagOffset = offset + 12 * i + 2;

				if (data.SHORT(tagOffset) == tag) {
					valueOffset = tagOffset + 8;
					break;
				}
			}

			if (!valueOffset) {
				return false;
			}

			data.LONG(valueOffset, value);
			return true;
		}


		// Public functions
		return {
			init: function(segment) {
				// Reset internal data
				offsets = {
					tiffHeader: 10
				};

				if (segment === undefined || !segment.length) {
					return false;
				}

				data.init(segment);

				// Check if that's APP1 and that it has EXIF
				if (data.SHORT(0) === 0xFFE1 && data.STRING(4, 5).toUpperCase() === "EXIF\0") {
					return getIFDOffsets();
				}
				return false;
			},

			TIFF: function() {
				return Tiff;
			},

			EXIF: function() {
				var Exif;

				// Populate EXIF hash
				Exif = extractTags(offsets.exifIFD, tags.exif);

				// Fix formatting of some tags
				if (Exif.ExifVersion && Basic.typeOf(Exif.ExifVersion) === 'array') {
					for (var i = 0, exifVersion = ''; i < Exif.ExifVersion.length; i++) {
						exifVersion += String.fromCharCode(Exif.ExifVersion[i]);
					}
					Exif.ExifVersion = exifVersion;
				}

				return Exif;
			},

			GPS: function() {
				var GPS;

				GPS = extractTags(offsets.gpsIFD, tags.gps);

				// iOS devices (and probably some others) do not put in GPSVersionID tag (why?..)
				if (GPS.GPSVersionID && Basic.typeOf(GPS.GPSVersionID) === 'array') {
					GPS.GPSVersionID = GPS.GPSVersionID.join('.');
				}

				return GPS;
			},

			setExif: function(tag, value) {
				// Right now only setting of width/height is possible
				if (tag !== 'PixelXDimension' && tag !== 'PixelYDimension') {return false;}

				return setTag('exif', tag, value);
			},


			getBinary: function() {
				return data.SEGMENT();
			},

			purge: function() {
				data.init(null);
				data = Tiff = null;
				offsets = {};
			}
		};
	};
});

// Included from: src/javascript/runtime/html5/image/JPEG.js

/**
 * JPEG.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/html5/image/JPEG
@private
*/
define("moxie/runtime/html5/image/JPEG", [
	"moxie/core/utils/Basic",
	"moxie/core/Exceptions",
	"moxie/runtime/html5/image/JPEGHeaders",
	"moxie/runtime/html5/utils/BinaryReader",
	"moxie/runtime/html5/image/ExifParser"
], function(Basic, x, JPEGHeaders, BinaryReader, ExifParser) {
	
	function JPEG(binstr) {
		var _binstr, _br, _hm, _ep, _info, hasExif;

		function _getDimensions() {
			var idx = 0, marker, length;

			// examine all through the end, since some images might have very large APP segments
			while (idx <= _binstr.length) {
				marker = _br.SHORT(idx += 2);

				if (marker >= 0xFFC0 && marker <= 0xFFC3) { // SOFn
					idx += 5; // marker (2 bytes) + length (2 bytes) + Sample precision (1 byte)
					return {
						height: _br.SHORT(idx),
						width: _br.SHORT(idx += 2)
					};
				}
				length = _br.SHORT(idx += 2);
				idx += length - 2;
			}
			return null;
		}

		_binstr = binstr;

		_br = new BinaryReader();
		_br.init(_binstr);

		// check if it is jpeg
		if (_br.SHORT(0) !== 0xFFD8) {
			throw new x.ImageError(x.ImageError.WRONG_FORMAT);
		}

		// backup headers
		_hm = new JPEGHeaders(binstr);

		// extract exif info
		_ep = new ExifParser();
		hasExif = !!_ep.init(_hm.get('app1')[0]);

		// get dimensions
		_info = _getDimensions.call(this);

		Basic.extend(this, {
			type: 'image/jpeg',

			size: _binstr.length,

			width: _info && _info.width || 0,

			height: _info && _info.height || 0,

			setExif: function(tag, value) {
				if (!hasExif) {
					return false; // or throw an exception
				}

				if (Basic.typeOf(tag) === 'object') {
					Basic.each(tag, function(value, tag) {
						_ep.setExif(tag, value);
					});
				} else {
					_ep.setExif(tag, value);
				}

				// update internal headers
				_hm.set('app1', _ep.getBinary());
			},

			writeHeaders: function() {
				if (!arguments.length) {
					// if no arguments passed, update headers internally
					return (_binstr = _hm.restore(_binstr));
				}
				return _hm.restore(arguments[0]);
			},

			stripHeaders: function(binstr) {
				return _hm.strip(binstr);
			},

			purge: function() {
				_purge.call(this);
			}
		});

		if (hasExif) {
			this.meta = {
				tiff: _ep.TIFF(),
				exif: _ep.EXIF(),
				gps: _ep.GPS()
			};
		}

		function _purge() {
			if (!_ep || !_hm || !_br) { 
				return; // ignore any repeating purge requests
			}
			_ep.purge();
			_hm.purge();
			_br.init(null);
			_binstr = _info = _hm = _ep = _br = null;
		}
	}

	return JPEG;
});

// Included from: src/javascript/runtime/html5/image/PNG.js

/**
 * PNG.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/html5/image/PNG
@private
*/
define("moxie/runtime/html5/image/PNG", [
	"moxie/core/Exceptions",
	"moxie/core/utils/Basic",
	"moxie/runtime/html5/utils/BinaryReader"
], function(x, Basic, BinaryReader) {
	
	function PNG(binstr) {
		var _binstr, _br, _hm, _ep, _info;

		_binstr = binstr;

		_br = new BinaryReader();
		_br.init(_binstr);

		// check if it's png
		(function() {
			var idx = 0, i = 0
			, signature = [0x8950, 0x4E47, 0x0D0A, 0x1A0A]
			;

			for (i = 0; i < signature.length; i++, idx += 2) {
				if (signature[i] != _br.SHORT(idx)) {
					throw new x.ImageError(x.ImageError.WRONG_FORMAT);
				}
			}
		}());

		function _getDimensions() {
			var chunk, idx;

			chunk = _getChunkAt.call(this, 8);

			if (chunk.type == 'IHDR') {
				idx = chunk.start;
				return {
					width: _br.LONG(idx),
					height: _br.LONG(idx += 4)
				};
			}
			return null;
		}

		function _purge() {
			if (!_br) {
				return; // ignore any repeating purge requests
			}
			_br.init(null);
			_binstr = _info = _hm = _ep = _br = null;
		}

		_info = _getDimensions.call(this);

		Basic.extend(this, {
			type: 'image/png',

			size: _binstr.length,

			width: _info.width,

			height: _info.height,

			purge: function() {
				_purge.call(this);
			}
		});

		// for PNG we can safely trigger purge automatically, as we do not keep any data for later
		_purge.call(this);

		function _getChunkAt(idx) {
			var length, type, start, CRC;

			length = _br.LONG(idx);
			type = _br.STRING(idx += 4, 4);
			start = idx += 4;
			CRC = _br.LONG(idx + length);

			return {
				length: length,
				type: type,
				start: start,
				CRC: CRC
			};
		}
	}

	return PNG;
});

// Included from: src/javascript/runtime/html5/image/ImageInfo.js

/**
 * ImageInfo.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/html5/image/ImageInfo
@private
*/
define("moxie/runtime/html5/image/ImageInfo", [
	"moxie/core/utils/Basic",
	"moxie/core/Exceptions",
	"moxie/runtime/html5/image/JPEG",
	"moxie/runtime/html5/image/PNG"
], function(Basic, x, JPEG, PNG) {
	/**
	Optional image investigation tool for HTML5 runtime. Provides the following features:
	- ability to distinguish image type (JPEG or PNG) by signature
	- ability to extract image width/height directly from it's internals, without preloading in memory (fast)
	- ability to extract APP headers from JPEGs (Exif, GPS, etc)
	- ability to replace width/height tags in extracted JPEG headers
	- ability to restore APP headers, that were for example stripped during image manipulation

	@class ImageInfo
	@constructor
	@param {String} binstr Image source as binary string
	*/
	return function(binstr) {
		var _cs = [JPEG, PNG], _img;

		// figure out the format, throw: ImageError.WRONG_FORMAT if not supported
		_img = (function() {
			for (var i = 0; i < _cs.length; i++) {
				try {
					return new _cs[i](binstr);
				} catch (ex) {
					// console.info(ex);
				}
			}
			throw new x.ImageError(x.ImageError.WRONG_FORMAT);
		}());

		Basic.extend(this, {
			/**
			Image Mime Type extracted from it's depths

			@property type
			@type {String}
			@default ''
			*/
			type: '',

			/**
			Image size in bytes

			@property size
			@type {Number}
			@default 0
			*/
			size: 0,

			/**
			Image width extracted from image source

			@property width
			@type {Number}
			@default 0
			*/
			width: 0,

			/**
			Image height extracted from image source

			@property height
			@type {Number}
			@default 0
			*/
			height: 0,

			/**
			Sets Exif tag. Currently applicable only for width and height tags. Obviously works only with JPEGs.

			@method setExif
			@param {String} tag Tag to set
			@param {Mixed} value Value to assign to the tag
			*/
			setExif: function() {},

			/**
			Restores headers to the source.

			@method writeHeaders
			@param {String} data Image source as binary string
			@return {String} Updated binary string
			*/
			writeHeaders: function(data) {
				return data;
			},

			/**
			Strip all headers from the source.

			@method stripHeaders
			@param {String} data Image source as binary string
			@return {String} Updated binary string
			*/
			stripHeaders: function(data) {
				return data;
			},

			/**
			Dispose resources.

			@method purge
			*/
			purge: function() {}
		});

		Basic.extend(this, _img);

		this.purge = function() {
			_img.purge();
			_img = null;
		};
	};
});

// Included from: src/javascript/runtime/html5/image/MegaPixel.js

/**
(The MIT License)

Copyright (c) 2012 Shinichi Tomita <shinichi.tomita@gmail.com>;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
 * Mega pixel image rendering library for iOS6 Safari
 *
 * Fixes iOS6 Safari's image file rendering issue for large size image (over mega-pixel),
 * which causes unexpected subsampling when drawing it in canvas.
 * By using this library, you can safely render the image with proper stretching.
 *
 * Copyright (c) 2012 Shinichi Tomita <shinichi.tomita@gmail.com>
 * Released under the MIT license
 */

/**
@class moxie/runtime/html5/image/MegaPixel
@private
*/
define("moxie/runtime/html5/image/MegaPixel", [], function() {

	/**
	 * Rendering image element (with resizing) into the canvas element
	 */
	function renderImageToCanvas(img, canvas, options) {
		var iw = img.naturalWidth, ih = img.naturalHeight;
		var width = options.width, height = options.height;
		var x = options.x || 0, y = options.y || 0;
		var ctx = canvas.getContext('2d');
		if (detectSubsampling(img)) {
			iw /= 2;
			ih /= 2;
		}
		var d = 1024; // size of tiling canvas
		var tmpCanvas = document.createElement('canvas');
		tmpCanvas.width = tmpCanvas.height = d;
		var tmpCtx = tmpCanvas.getContext('2d');
		var vertSquashRatio = detectVerticalSquash(img, iw, ih);
		var sy = 0;
		while (sy < ih) {
			var sh = sy + d > ih ? ih - sy : d;
			var sx = 0;
			while (sx < iw) {
				var sw = sx + d > iw ? iw - sx : d;
				tmpCtx.clearRect(0, 0, d, d);
				tmpCtx.drawImage(img, -sx, -sy);
				var dx = (sx * width / iw + x) << 0;
				var dw = Math.ceil(sw * width / iw);
				var dy = (sy * height / ih / vertSquashRatio + y) << 0;
				var dh = Math.ceil(sh * height / ih / vertSquashRatio);
				ctx.drawImage(tmpCanvas, 0, 0, sw, sh, dx, dy, dw, dh);
				sx += d;
			}
			sy += d;
		}
		tmpCanvas = tmpCtx = null;
	}

	/**
	 * Detect subsampling in loaded image.
	 * In iOS, larger images than 2M pixels may be subsampled in rendering.
	 */
	function detectSubsampling(img) {
		var iw = img.naturalWidth, ih = img.naturalHeight;
		if (iw * ih > 1024 * 1024) { // subsampling may happen over megapixel image
			var canvas = document.createElement('canvas');
			canvas.width = canvas.height = 1;
			var ctx = canvas.getContext('2d');
			ctx.drawImage(img, -iw + 1, 0);
			// subsampled image becomes half smaller in rendering size.
			// check alpha channel value to confirm image is covering edge pixel or not.
			// if alpha value is 0 image is not covering, hence subsampled.
			return ctx.getImageData(0, 0, 1, 1).data[3] === 0;
		} else {
			return false;
		}
	}


	/**
	 * Detecting vertical squash in loaded image.
	 * Fixes a bug which squash image vertically while drawing into canvas for some images.
	 */
	function detectVerticalSquash(img, iw, ih) {
		var canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = ih;
		var ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0);
		var data = ctx.getImageData(0, 0, 1, ih).data;
		// search image edge pixel position in case it is squashed vertically.
		var sy = 0;
		var ey = ih;
		var py = ih;
		while (py > sy) {
			var alpha = data[(py - 1) * 4 + 3];
			if (alpha === 0) {
				ey = py;
			} else {
			sy = py;
			}
			py = (ey + sy) >> 1;
		}
		canvas = null;
		var ratio = (py / ih);
		return (ratio === 0) ? 1 : ratio;
	}

	return {
		isSubsampled: detectSubsampling,
		renderTo: renderImageToCanvas
	};
});

// Included from: src/javascript/runtime/html5/image/Image.js

/**
 * Image.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/html5/image/Image
@private
*/
define("moxie/runtime/html5/image/Image", [
	"moxie/runtime/html5/Runtime",
	"moxie/core/utils/Basic",
	"moxie/core/Exceptions",
	"moxie/core/utils/Encode",
	"moxie/file/File",
	"moxie/runtime/html5/image/ImageInfo",
	"moxie/runtime/html5/image/MegaPixel",
	"moxie/core/utils/Mime",
	"moxie/core/utils/Env"
], function(extensions, Basic, x, Encode, File, ImageInfo, MegaPixel, Mime, Env) {
	
	function HTML5Image() {
		var me = this
		, _img, _imgInfo, _canvas, _binStr, _blob
		, _modified = false // is set true whenever image is modified
		, _preserveHeaders = true
		;

		Basic.extend(this, {
			loadFromBlob: function(blob) {
				var comp = this, I = comp.getRuntime()
				, asBinary = arguments.length > 1 ? arguments[1] : true
				;

				if (!I.can('access_binary')) {
					throw new x.RuntimeError(x.RuntimeError.NOT_SUPPORTED_ERR);
				}

				_blob = blob;

				if (blob.isDetached()) {
					_binStr = blob.getSource();
					_preload.call(this, _binStr);
					return;
				} else {
					_readAsDataUrl.call(this, blob.getSource(), function(dataUrl) {
						if (asBinary) {
							_binStr = _toBinary(dataUrl);
						}
						_preload.call(comp, dataUrl);
					});
				}
			},

			loadFromImage: function(img, exact) {
				this.meta = img.meta;

				_blob = new File(null, {
					name: img.name,
					size: img.size,
					type: img.type
				});

				_preload.call(this, exact ? (_binStr = img.getAsBinaryString()) : img.getAsDataURL());
			},

			getInfo: function() {
				var I = this.getRuntime(), info;

				if (!_imgInfo && _binStr && I.can('access_image_binary')) {
					_imgInfo = new ImageInfo(_binStr);
				}

				info = {
					width: _getImg().width || 0,
					height: _getImg().height || 0,
					type: _blob.type || Mime.getFileMime(_blob.name),
					size: _binStr && _binStr.length || _blob.size || 0,
					name: _blob.name || '',
					meta: _imgInfo && _imgInfo.meta || this.meta || {}
				};

				return info;
			},

			downsize: function() {
				_downsize.apply(this, arguments);
			},

			getAsCanvas: function() {
				if (_canvas) {
					_canvas.id = this.uid + '_canvas';
				}
				return _canvas;
			},

			getAsBlob: function(type, quality) {
				if (type !== this.type) {
					// if different mime type requested prepare image for conversion
					_downsize.call(this, this.width, this.height, false);
				}
				return new File(null, {
					name: _blob.name || '',
					type: type,
					data: me.getAsBinaryString.call(this, type, quality)
				});
			},

			getAsDataURL: function(type) {
				var quality = arguments[1] || 90;

				// if image has not been modified, return the source right away
				if (!_modified) {
					return _img.src;
				}

				if ('image/jpeg' !== type) {
					return _canvas.toDataURL('image/png');
				} else {
					try {
						// older Geckos used to result in an exception on quality argument
						return _canvas.toDataURL('image/jpeg', quality/100);
					} catch (ex) {
						return _canvas.toDataURL('image/jpeg');
					}
				}
			},

			getAsBinaryString: function(type, quality) {
				// if image has not been modified, return the source right away
				if (!_modified) {
					// if image was not loaded from binary string
					if (!_binStr) {
						_binStr = _toBinary(me.getAsDataURL(type, quality));
					}
					return _binStr;
				}

				if ('image/jpeg' !== type) {
					_binStr = _toBinary(me.getAsDataURL(type, quality));
				} else {
					var dataUrl;

					// if jpeg
					if (!quality) {
						quality = 90;
					}

					try {
						// older Geckos used to result in an exception on quality argument
						dataUrl = _canvas.toDataURL('image/jpeg', quality/100);
					} catch (ex) {
						dataUrl = _canvas.toDataURL('image/jpeg');
					}

					_binStr = _toBinary(dataUrl);

					if (_imgInfo) {
						_binStr = _imgInfo.stripHeaders(_binStr);

						if (_preserveHeaders) {
							// update dimensions info in exif
							if (_imgInfo.meta && _imgInfo.meta.exif) {
								_imgInfo.setExif({
									PixelXDimension: this.width,
									PixelYDimension: this.height
								});
							}

							// re-inject the headers
							_binStr = _imgInfo.writeHeaders(_binStr);
						}

						// will be re-created from fresh on next getInfo call
						_imgInfo.purge();
						_imgInfo = null;
					}
				}

				_modified = false;

				return _binStr;
			},

			destroy: function() {
				me = null;
				_purge.call(this);
				this.getRuntime().getShim().removeInstance(this.uid);
			}
		});


		function _getImg() {
			if (!_canvas && !_img) {
				throw new x.ImageError(x.DOMException.INVALID_STATE_ERR);
			}
			return _canvas || _img;
		}


		function _toBinary(str) {
			return Encode.atob(str.substring(str.indexOf('base64,') + 7));
		}


		function _toDataUrl(str, type) {
			return 'data:' + (type || '') + ';base64,' + Encode.btoa(str);
		}


		function _preload(str) {
			var comp = this;

			_img = new Image();
			_img.onerror = function() {
				_purge.call(this);
				comp.trigger('error', new x.ImageError(x.ImageError.WRONG_FORMAT));
			};
			_img.onload = function() {
				comp.trigger('load');
			};

			_img.src = /^data:[^;]*;base64,/.test(str) ? str : _toDataUrl(str, _blob.type);
		}


		function _readAsDataUrl(file, callback) {
			var comp = this, fr;

			// use FileReader if it's available
			if (window.FileReader) {
				fr = new FileReader();
				fr.onload = function() {
					callback(this.result);
				};
				fr.onerror = function() {
					comp.trigger('error', new x.FileException(x.FileException.NOT_READABLE_ERR));
				};
				fr.readAsDataURL(file);
			} else {
				return callback(file.getAsDataURL());
			}
		}

		function _downsize(width, height, crop, preserveHeaders) {
			var self = this
			, scale
			, mathFn
			, x = 0
			, y = 0
			, img
			, destWidth
			, destHeight
			, orientation
			;

			_preserveHeaders = preserveHeaders; // we will need to check this on export (see getAsBinaryString())

			// take into account orientation tag
			orientation = (this.meta && this.meta.tiff && this.meta.tiff.Orientation) || 1;

			if (Basic.inArray(orientation, [5,6,7,8]) !== -1) { // values that require 90 degree rotation
				// swap dimensions
				var tmp = width;
				width = height;
				height = tmp;
			}

			img = _getImg();

			// unify dimensions
			mathFn = !crop ? Math.min : Math.max;
			scale = mathFn(width/img.width, height/img.height);
		
			// we only downsize here
			if (scale > 1 && (!crop || preserveHeaders)) { // when cropping one of dimensions may still exceed max, so process it anyway
				this.trigger('Resize');
				return;
			}

			// prepare canvas if necessary
			if (!_canvas) {
				_canvas = document.createElement("canvas");
			}

			// calculate dimensions of proportionally resized image
			destWidth = Math.round(img.width * scale);	
			destHeight = Math.round(img.height * scale);


			// scale image and canvas
			if (crop) {
				_canvas.width = width;
				_canvas.height = height;

				// if dimensions of the resulting image still larger than canvas, center it
				if (destWidth > width) {
					x = Math.round((destWidth - width) / 2);
				}

				if (destHeight > height) {
					y = Math.round((destHeight - height) / 2);
				}
			} else {
				_canvas.width = destWidth;
				_canvas.height = destHeight;
			}

			// rotate if required, according to orientation tag
			if (!_preserveHeaders) {
				_rotateToOrientaion(_canvas.width, _canvas.height, orientation);
			}

			_drawToCanvas.call(this, img, _canvas, -x, -y, destWidth, destHeight);

			this.width = _canvas.width;
			this.height = _canvas.height;

			_modified = true;
			self.trigger('Resize');
		}


		function _drawToCanvas(img, canvas, x, y, w, h) {
			if (Env.OS === 'iOS') { 
				// avoid squish bug in iOS6
				MegaPixel.renderTo(img, canvas, { width: w, height: h, x: x, y: y });
			} else {
				var ctx = canvas.getContext('2d');
				ctx.drawImage(img, x, y, w, h);
			}
		}


		/**
		* Transform canvas coordination according to specified frame size and orientation
		* Orientation value is from EXIF tag
		* @author Shinichi Tomita <shinichi.tomita@gmail.com>
		*/
		function _rotateToOrientaion(width, height, orientation) {
			switch (orientation) {
				case 5:
				case 6:
				case 7:
				case 8:
					_canvas.width = height;
					_canvas.height = width;
					break;
				default:
					_canvas.width = width;
					_canvas.height = height;
			}

			/**
			1 = The 0th row is at the visual top of the image, and the 0th column is the visual left-hand side.
			2 = The 0th row is at the visual top of the image, and the 0th column is the visual right-hand side.
			3 = The 0th row is at the visual bottom of the image, and the 0th column is the visual right-hand side.
			4 = The 0th row is at the visual bottom of the image, and the 0th column is the visual left-hand side.
			5 = The 0th row is the visual left-hand side of the image, and the 0th column is the visual top.
			6 = The 0th row is the visual right-hand side of the image, and the 0th column is the visual top.
			7 = The 0th row is the visual right-hand side of the image, and the 0th column is the visual bottom.
			8 = The 0th row is the visual left-hand side of the image, and the 0th column is the visual bottom.
			*/

			var ctx = _canvas.getContext('2d');
			switch (orientation) {
				case 2:
					// horizontal flip
					ctx.translate(width, 0);
					ctx.scale(-1, 1);
					break;
				case 3:
					// 180 rotate left
					ctx.translate(width, height);
					ctx.rotate(Math.PI);
					break;
				case 4:
					// vertical flip
					ctx.translate(0, height);
					ctx.scale(1, -1);
					break;
				case 5:
					// vertical flip + 90 rotate right
					ctx.rotate(0.5 * Math.PI);
					ctx.scale(1, -1);
					break;
				case 6:
					// 90 rotate right
					ctx.rotate(0.5 * Math.PI);
					ctx.translate(0, -height);
					break;
				case 7:
					// horizontal flip + 90 rotate right
					ctx.rotate(0.5 * Math.PI);
					ctx.translate(width, -height);
					ctx.scale(-1, 1);
					break;
				case 8:
					// 90 rotate left
					ctx.rotate(-0.5 * Math.PI);
					ctx.translate(-width, 0);
					break;
			}
		}


		function _purge() {
			if (_imgInfo) {
				_imgInfo.purge();
				_imgInfo = null;
			}
			_binStr = _img = _canvas = _blob = null;
			_modified = false;
		}
	}

	return (extensions.Image = HTML5Image);
});

// Included from: src/javascript/runtime/flash/Runtime.js

/**
 * Runtime.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/*global ActiveXObject:true */

/**
Defines constructor for Flash runtime.

@class moxie/runtime/flash/Runtime
@private
*/
define("moxie/runtime/flash/Runtime", [
	"moxie/core/utils/Basic",
	"moxie/core/utils/Env",
	"moxie/core/utils/Dom",
	"moxie/core/Exceptions",
	"moxie/runtime/Runtime"
], function(Basic, Env, Dom, x, Runtime) {
	
	var type = 'flash', extensions = {};

	/**
	Get the version of the Flash Player

	@method getShimVersion
	@private
	@return {Number} Flash Player version
	*/
	function getShimVersion() {
		var version;

		try {
			version = navigator.plugins['Shockwave Flash'];
			version = version.description;
		} catch (e1) {
			try {
				version = new ActiveXObject('ShockwaveFlash.ShockwaveFlash').GetVariable('$version');
			} catch (e2) {
				version = '0.0';
			}
		}
		version = version.match(/\d+/g);
		return parseFloat(version[0] + '.' + version[1]);
	}

	/**
	Constructor for the Flash Runtime

	@class FlashRuntime
	@extends Runtime
	*/
	function FlashRuntime(options) {
		var I = this, initTimer;

		options = Basic.extend({ swf_url: Env.swf_url }, options);

		Runtime.call(this, options, type, {
			access_binary: function(value) {
				return value && I.mode === 'browser';
			},
			access_image_binary: function(value) {
				return value && I.mode === 'browser';
			},
			display_media: Runtime.capTrue,
			do_cors: Runtime.capTrue,
			drag_and_drop: false,
			report_upload_progress: function() {
				return I.mode === 'client';
			},
			resize_image: Runtime.capTrue,
			return_response_headers: false,
			return_response_type: function(responseType) {
				if (responseType === 'json' && !!window.JSON) {
					return true;
				} 
				return !Basic.arrayDiff(responseType, ['', 'text', 'document']) || I.mode === 'browser';
			},
			return_status_code: function(code) {
				return I.mode === 'browser' || !Basic.arrayDiff(code, [200, 404]);
			},
			select_file: Runtime.capTrue,
			select_multiple: Runtime.capTrue,
			send_binary_string: function(value) {
				return value && I.mode === 'browser';
			},
			send_browser_cookies: function(value) {
				return value && I.mode === 'browser';
			},
			send_custom_headers: function(value) {
				return value && I.mode === 'browser';
			},
			send_multipart: Runtime.capTrue,
			slice_blob: Runtime.capTrue,
			stream_upload: function(value) {
				return value && I.mode === 'browser';
			},
			summon_file_dialog: false,
			upload_filesize: function(size) {
				return Basic.parseSizeStr(size) <= 2097152 || I.mode === 'client';
			},
			use_http_method: function(methods) {
				return !Basic.arrayDiff(methods, ['GET', 'POST']);
			}
		}, { 
			// capabilities that require specific mode
			access_binary: function(value) {
				return value ? 'browser' : 'client';
			},
			access_image_binary: function(value) {
				return value ? 'browser' : 'client';
			},
			report_upload_progress: function(value) {
				return value ? 'browser' : 'client';
			},
			return_response_type: function(responseType) {
				return Basic.arrayDiff(responseType, ['', 'text', 'json', 'document']) ? 'browser' : ['client', 'browser'];
			},
			return_status_code: function(code) {
				return Basic.arrayDiff(code, [200, 404]) ? 'browser' : ['client', 'browser'];
			},
			send_binary_string: function(value) {
				return value ? 'browser' : 'client';
			},
			send_browser_cookies: function(value) {
				return value ? 'browser' : 'client';
			},
			send_custom_headers: function(value) {
				return value ? 'browser' : 'client';
			},
			stream_upload: function(value) {
				return value ? 'client' : 'browser';
			},
			upload_filesize: function(size) {
				return Basic.parseSizeStr(size) >= 2097152 ? 'client' : 'browser';
			}
		}, 'client');


		// minimal requirement for Flash Player version
		if (getShimVersion() < 10) {
			this.mode = false; // with falsy mode, runtime won't operable, no matter what the mode was before
		}


		Basic.extend(this, {

			getShim: function() {
				return Dom.get(this.uid);
			},

			shimExec: function(component, action) {
				var args = [].slice.call(arguments, 2);
				return I.getShim().exec(this.uid, component, action, args);
			},

			init: function() {
				var html, el, container;

				container = this.getShimContainer();

				// if not the minimal height, shims are not initialized in older browsers (e.g FF3.6, IE6,7,8, Safari 4.0,5.0, etc)
				Basic.extend(container.style, {
					position: 'absolute',
					top: '-8px',
					left: '-8px',
					width: '9px',
					height: '9px',
					overflow: 'hidden'
				});

				// insert flash object
				html = '<object id="' + this.uid + '" type="application/x-shockwave-flash" data="' +  options.swf_url + '" ';

				if (Env.browser === 'IE') {
					html += 'classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" ';
				}

				html += 'width="100%" height="100%" style="outline:0">'  +
					'<param name="movie" value="' + options.swf_url + '" />' +
					'<param name="flashvars" value="uid=' + escape(this.uid) + '&target=' + Env.global_event_dispatcher + '" />' +
					'<param name="wmode" value="transparent" />' +
					'<param name="allowscriptaccess" value="always" />' +
				'</object>';

				if (Env.browser === 'IE') {
					el = document.createElement('div');
					container.appendChild(el);
					el.outerHTML = html;
					el = container = null; // just in case
				} else {
					container.innerHTML = html;
				}

				// Init is dispatched by the shim
				initTimer = setTimeout(function() {
					if (I && !I.initialized) { // runtime might be already destroyed by this moment
						I.trigger("Error", new x.RuntimeError(x.RuntimeError.NOT_INIT_ERR));
					}
				}, 5000);
			},

			destroy: (function(destroy) { // extend default destroy method
				return function() {
					destroy.call(I);
					clearTimeout(initTimer); // initialization check might be still onwait
					options = initTimer = destroy = I = null;
				};
			}(this.destroy))

		}, extensions);
	}

	Runtime.addConstructor(type, FlashRuntime);

	return extensions;
});

// Included from: src/javascript/runtime/flash/file/Blob.js

/**
 * Blob.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/flash/file/Blob
@private
*/
define("moxie/runtime/flash/file/Blob", [
	"moxie/runtime/flash/Runtime",
	"moxie/file/Blob"
], function(extensions, Blob) {

	var FlashBlob = {
		slice: function(blob, start, end, type) {
			var self = this.getRuntime();

			if (start < 0) {
				start = Math.max(blob.size + start, 0);
			} else if (start > 0) {
				start = Math.min(start, blob.size);
			}

			if (end < 0) {
				end = Math.max(blob.size + end, 0);
			} else if (end > 0) {
				end = Math.min(end, blob.size);
			}

			blob = self.shimExec.call(this, 'Blob', 'slice', start, end, type || '');

			if (blob) {
				blob = new Blob(self.uid, blob);
			}
			return blob;
		}
	};

	return (extensions.Blob = FlashBlob);
});

// Included from: src/javascript/runtime/flash/file/FileInput.js

/**
 * FileInput.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/flash/file/FileInput
@private
*/
define("moxie/runtime/flash/file/FileInput", [
	"moxie/runtime/flash/Runtime"
], function(extensions) {
	
	var FileInput = {		
		init: function(options) {
			this.getRuntime().shimExec.call(this, 'FileInput', 'init', {
				name: options.name,
				accept: options.accept,
				multiple: options.multiple
			});
			this.trigger('ready');
		}
	};

	return (extensions.FileInput = FileInput);
});

// Included from: src/javascript/runtime/flash/file/FileReader.js

/**
 * FileReader.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/flash/file/FileReader
@private
*/
define("moxie/runtime/flash/file/FileReader", [
	"moxie/runtime/flash/Runtime",
	"moxie/core/utils/Encode"
], function(extensions, Encode) {

	var _result = '';

	function _formatData(data, op) {
		switch (op) {
			case 'readAsText':
				return Encode.atob(data, 'utf8');
			case 'readAsBinaryString':
				return Encode.atob(data);
			case 'readAsDataURL':
				return data;
		}
		return null;
	}

	var FileReader = {
		read: function(op, blob) {
			var target = this, self = target.getRuntime();

			// special prefix for DataURL read mode
			if (op === 'readAsDataURL') {
				_result = 'data:' + (blob.type || '') + ';base64,';
			}

			target.bind('Progress', function(e, data) {
				if (data) {
					_result += _formatData(data, op);
				}
			});

			return self.shimExec.call(this, 'FileReader', 'readAsBase64', blob.uid);
		},

		getResult: function() {
			return _result;
		},

		destroy: function() {
			_result = null;
		}
	};

	return (extensions.FileReader = FileReader);
});

// Included from: src/javascript/runtime/flash/file/FileReaderSync.js

/**
 * FileReaderSync.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/flash/file/FileReaderSync
@private
*/
define("moxie/runtime/flash/file/FileReaderSync", [
	"moxie/runtime/flash/Runtime",
	"moxie/core/utils/Encode"
], function(extensions, Encode) {
	
	function _formatData(data, op) {
		switch (op) {
			case 'readAsText':
				return Encode.atob(data, 'utf8');
			case 'readAsBinaryString':
				return Encode.atob(data);
			case 'readAsDataURL':
				return data;
		}
		return null;
	}

	var FileReaderSync = {
		read: function(op, blob) {
			var result, self = this.getRuntime();

			result = self.shimExec.call(this, 'FileReaderSync', 'readAsBase64', blob.uid);
			if (!result) {
				return null; // or throw ex
			}

			// special prefix for DataURL read mode
			if (op === 'readAsDataURL') {
				result = 'data:' + (blob.type || '') + ';base64,' + result;
			}

			return _formatData(result, op, blob.type);
		}
	};

	return (extensions.FileReaderSync = FileReaderSync);
});

// Included from: src/javascript/runtime/flash/xhr/XMLHttpRequest.js

/**
 * XMLHttpRequest.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/flash/xhr/XMLHttpRequest
@private
*/
define("moxie/runtime/flash/xhr/XMLHttpRequest", [
	"moxie/runtime/flash/Runtime",
	"moxie/core/utils/Basic",
	"moxie/file/Blob",
	"moxie/file/File",
	"moxie/file/FileReaderSync",
	"moxie/xhr/FormData",
	"moxie/runtime/Transporter"
], function(extensions, Basic, Blob, File, FileReaderSync, FormData, Transporter) {
	
	var XMLHttpRequest = {

		send: function(meta, data) {
			var target = this, self = target.getRuntime();

			function send() {
				meta.transport = self.mode;
				self.shimExec.call(target, 'XMLHttpRequest', 'send', meta, data);
			}


			function appendBlob(name, blob) {
				self.shimExec.call(target, 'XMLHttpRequest', 'appendBlob', name, blob.uid);
				data = null;
				send();
			}


			function attachBlob(blob, cb) {
				var tr = new Transporter();

				tr.bind("TransportingComplete", function() {
					cb(this.result);
				});

				tr.transport(blob.getSource(), blob.type, {
					ruid: self.uid
				});
			}

			// copy over the headers if any
			if (!Basic.isEmptyObj(meta.headers)) {
				Basic.each(meta.headers, function(value, header) {
					self.shimExec.call(target, 'XMLHttpRequest', 'setRequestHeader', header, value.toString()); // Silverlight doesn't accept integers into the arguments of type object
				});
			}

			// transfer over multipart params and blob itself
			if (data instanceof FormData) {
				var blobField;
				data.each(function(value, name) {
					if (value instanceof Blob) {
						blobField = name;
					} else {
						self.shimExec.call(target, 'XMLHttpRequest', 'append', name, value);
					}
				});

				if (!data.hasBlob()) {
					data = null;
					send();
				} else {
					var blob = data.getBlob();
					if (blob.isDetached()) {
						attachBlob(blob, function(attachedBlob) {
							blob.destroy();
							appendBlob(blobField, attachedBlob);		
						});
					} else {
						appendBlob(blobField, blob);
					}
				}
			} else if (data instanceof Blob) {
				if (data.isDetached()) {
					attachBlob(data, function(attachedBlob) {
						data.destroy();
						data = attachedBlob.uid;
						send();
					});
				} else {
					data = data.uid;
					send();
				}
			} else {
				send();
			}
		},

		getResponse: function(responseType) {
			var frs, blob, self = this.getRuntime();

			blob = self.shimExec.call(this, 'XMLHttpRequest', 'getResponseAsBlob');

			if (blob) {
				blob = new File(self.uid, blob);

				if ('blob' === responseType) {
					return blob;
				}

				try { 
					frs = new FileReaderSync();

					if (!!~Basic.inArray(responseType, ["", "text"])) {
						return frs.readAsText(blob);
					} else if ('json' === responseType && !!window.JSON) {
						return JSON.parse(frs.readAsText(blob));
					}
				} finally {
					blob.destroy();
				}
			}
			return null;
		},

		abort: function(upload_complete_flag) {
			var self = this.getRuntime();

			self.shimExec.call(this, 'XMLHttpRequest', 'abort');

			this.dispatchEvent('readystatechange');
			// this.dispatchEvent('progress');
			this.dispatchEvent('abort');

			//if (!upload_complete_flag) {
				// this.dispatchEvent('uploadprogress');
			//}
		}
	};

	return (extensions.XMLHttpRequest = XMLHttpRequest);
});

// Included from: src/javascript/runtime/flash/runtime/Transporter.js

/**
 * Transporter.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/flash/runtime/Transporter
@private
*/
define("moxie/runtime/flash/runtime/Transporter", [
	"moxie/runtime/flash/Runtime",
	"moxie/file/Blob"
], function(extensions, Blob) {

	var Transporter = {
		getAsBlob: function(type) {
			var self = this.getRuntime()
			, blob = self.shimExec.call(this, 'Transporter', 'getAsBlob', type)
			;
			if (blob) {
				return new Blob(self.uid, blob);
			}
			return null;
		}
	};

	return (extensions.Transporter = Transporter);
});

// Included from: src/javascript/runtime/flash/image/Image.js

/**
 * Image.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/flash/image/Image
@private
*/
define("moxie/runtime/flash/image/Image", [
	"moxie/runtime/flash/Runtime",
	"moxie/core/utils/Basic",
	"moxie/runtime/Transporter",
	"moxie/file/Blob",
	"moxie/file/FileReaderSync"
], function(extensions, Basic, Transporter, Blob, FileReaderSync) {
	
	var Image = {
		loadFromBlob: function(blob) {
			var comp = this, self = comp.getRuntime();

			function exec(srcBlob) {
				self.shimExec.call(comp, 'Image', 'loadFromBlob', srcBlob.uid);
				comp = self = null;
			}

			if (blob.isDetached()) { // binary string
				var tr = new Transporter();
				tr.bind("TransportingComplete", function() {
					exec(tr.result.getSource());
				});
				tr.transport(blob.getSource(), blob.type, { ruid: self.uid });
			} else {
				exec(blob.getSource());
			}
		},

		loadFromImage: function(img) {
			var self = this.getRuntime();
			return self.shimExec.call(this, 'Image', 'loadFromImage', img.uid);
		},

		getAsBlob: function(type, quality) {
			var self = this.getRuntime()
			, blob = self.shimExec.call(this, 'Image', 'getAsBlob', type, quality)
			;
			if (blob) {
				return new Blob(self.uid, blob);
			}
			return null;
		},

		getAsDataURL: function() {
			var self = this.getRuntime()
			, blob = self.Image.getAsBlob.apply(this, arguments)
			, frs
			;
			if (!blob) {
				return null;
			}
			frs = new FileReaderSync();
			return frs.readAsDataURL(blob);
		}
	};

	return (extensions.Image = Image);
});

// Included from: src/javascript/runtime/silverlight/Runtime.js

/**
 * RunTime.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/*global ActiveXObject:true */

/**
Defines constructor for Silverlight runtime.

@class moxie/runtime/silverlight/Runtime
@private
*/
define("moxie/runtime/silverlight/Runtime", [
	"moxie/core/utils/Basic",
	"moxie/core/utils/Env",
	"moxie/core/utils/Dom",
	"moxie/core/Exceptions",
	"moxie/runtime/Runtime"
], function(Basic, Env, Dom, x, Runtime) {
	
	var type = "silverlight", extensions = {};

	function isInstalled(version) {
		var isVersionSupported = false, control = null, actualVer,
			actualVerArray, reqVerArray, requiredVersionPart, actualVersionPart, index = 0;

		try {
			try {
				control = new ActiveXObject('AgControl.AgControl');

				if (control.IsVersionSupported(version)) {
					isVersionSupported = true;
				}

				control = null;
			} catch (e) {
				var plugin = navigator.plugins["Silverlight Plug-In"];

				if (plugin) {
					actualVer = plugin.description;

					if (actualVer === "1.0.30226.2") {
						actualVer = "2.0.30226.2";
					}

					actualVerArray = actualVer.split(".");

					while (actualVerArray.length > 3) {
						actualVerArray.pop();
					}

					while ( actualVerArray.length < 4) {
						actualVerArray.push(0);
					}

					reqVerArray = version.split(".");

					while (reqVerArray.length > 4) {
						reqVerArray.pop();
					}

					do {
						requiredVersionPart = parseInt(reqVerArray[index], 10);
						actualVersionPart = parseInt(actualVerArray[index], 10);
						index++;
					} while (index < reqVerArray.length && requiredVersionPart === actualVersionPart);

					if (requiredVersionPart <= actualVersionPart && !isNaN(requiredVersionPart)) {
						isVersionSupported = true;
					}
				}
			}
		} catch (e2) {
			isVersionSupported = false;
		}

		return isVersionSupported;
	}

	/**
	Constructor for the Silverlight Runtime

	@class SilverlightRuntime
	@extends Runtime
	*/
	function SilverlightRuntime(options) {
		var I = this, initTimer;

		options = Basic.extend({ xap_url: Env.xap_url }, options);

		Runtime.call(this, options, type, {
			access_binary: Runtime.capTrue,
			access_image_binary: Runtime.capTrue,
			display_media: Runtime.capTrue,
			do_cors: Runtime.capTrue,
			drag_and_drop: false,
			report_upload_progress: Runtime.capTrue,
			resize_image: Runtime.capTrue,
			return_response_headers: function(value) {
				return value && I.mode === 'client';
			},
			return_response_type: function(responseType) {
				if (responseType !== 'json') {
					return true;
				} else {
					return !!window.JSON;
				}
			},
			return_status_code: function(code) {
				return I.mode === 'client' || !Basic.arrayDiff(code, [200, 404]);
			},
			select_file: Runtime.capTrue,
			select_multiple: Runtime.capTrue,
			send_binary_string: Runtime.capTrue,
			send_browser_cookies: function(value) {
				return value && I.mode === 'browser';
			},
			send_custom_headers: function(value) {
				return value && I.mode === 'client';
			},
			send_multipart: Runtime.capTrue,
			slice_blob: Runtime.capTrue,
			stream_upload: true,
			summon_file_dialog: false,
			upload_filesize: Runtime.capTrue,
			use_http_method: function(methods) {
				return I.mode === 'client' || !Basic.arrayDiff(methods, ['GET', 'POST']);
			}
		}, { 
			// capabilities that require specific mode
			return_response_headers: function(value) {
				return value ? 'client' : 'browser';
			},
			return_status_code: function(code) {
				return Basic.arrayDiff(code, [200, 404]) ? 'client' : ['client', 'browser'];
			},
			send_browser_cookies: function(value) {
				return value ? 'browser' : 'client';
			},
			send_custom_headers: function(value) {
				return value ? 'client' : 'browser';
			},
			use_http_method: function(methods) {
				return Basic.arrayDiff(methods, ['GET', 'POST']) ? 'client' : ['client', 'browser'];
			}
		});


		// minimal requirement
		if (!isInstalled('2.0.31005.0') || Env.browser === 'Opera') {
			this.mode = false;
		}


		Basic.extend(this, {
			getShim: function() {
				return Dom.get(this.uid).content.Moxie;
			},

			shimExec: function(component, action) {
				var args = [].slice.call(arguments, 2);
				return I.getShim().exec(this.uid, component, action, args);
			},

			init : function() {
				var container;

				container = this.getShimContainer();

				container.innerHTML = '<object id="' + this.uid + '" data="data:application/x-silverlight," type="application/x-silverlight-2" width="100%" height="100%" style="outline:none;">' +
					'<param name="source" value="' + options.xap_url + '"/>' +
					'<param name="background" value="Transparent"/>' +
					'<param name="windowless" value="true"/>' +
					'<param name="enablehtmlaccess" value="true"/>' +
					'<param name="initParams" value="uid=' + this.uid + ',target=' + Env.global_event_dispatcher + '"/>' +
				'</object>';

				// Init is dispatched by the shim
				initTimer = setTimeout(function() {
					if (I && !I.initialized) { // runtime might be already destroyed by this moment
						I.trigger("Error", new x.RuntimeError(x.RuntimeError.NOT_INIT_ERR));
					}
				}, Env.OS !== 'Windows'? 10000 : 5000); // give it more time to initialize in non Windows OS (like Mac)
			},

			destroy: (function(destroy) { // extend default destroy method
				return function() {
					destroy.call(I);
					clearTimeout(initTimer); // initialization check might be still onwait
					options = initTimer = destroy = I = null;
				};
			}(this.destroy))

		}, extensions);
	}

	Runtime.addConstructor(type, SilverlightRuntime); 

	return extensions;
});

// Included from: src/javascript/runtime/silverlight/file/Blob.js

/**
 * Blob.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/silverlight/file/Blob
@private
*/
define("moxie/runtime/silverlight/file/Blob", [
	"moxie/runtime/silverlight/Runtime",
	"moxie/core/utils/Basic",
	"moxie/runtime/flash/file/Blob"
], function(extensions, Basic, Blob) {
	return (extensions.Blob = Basic.extend({}, Blob));
});

// Included from: src/javascript/runtime/silverlight/file/FileInput.js

/**
 * FileInput.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/silverlight/file/FileInput
@private
*/
define("moxie/runtime/silverlight/file/FileInput", [
	"moxie/runtime/silverlight/Runtime"
], function(extensions) {
	
	var FileInput = {
		init: function(options) {

			function toFilters(accept) {
				var filter = '';
				for (var i = 0; i < accept.length; i++) {
					filter += (filter !== '' ? '|' : '') + accept[i].title + " | *." + accept[i].extensions.replace(/,/g, ';*.');
				}
				return filter;
			}
			
			this.getRuntime().shimExec.call(this, 'FileInput', 'init', toFilters(options.accept), options.name, options.multiple);
			this.trigger('ready');
		}
	};

	return (extensions.FileInput = FileInput);
});

// Included from: src/javascript/runtime/silverlight/file/FileDrop.js

/**
 * FileDrop.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/silverlight/file/FileDrop
@private
*/
define("moxie/runtime/silverlight/file/FileDrop", [
	"moxie/runtime/silverlight/Runtime",
	"moxie/core/utils/Dom", 
	"moxie/core/utils/Events"
], function(extensions, Dom, Events) {

	// not exactly useful, since works only in safari (...crickets...)
	var FileDrop = {
		init: function() {
			var comp = this, self = comp.getRuntime(), dropZone;

			dropZone = self.getShimContainer();

			Events.addEvent(dropZone, 'dragover', function(e) {
				e.preventDefault();
				e.stopPropagation();
				e.dataTransfer.dropEffect = 'copy';
			}, comp.uid);

			Events.addEvent(dropZone, 'dragenter', function(e) {
				e.preventDefault();
				var flag = Dom.get(self.uid).dragEnter(e);
				// If handled, then stop propagation of event in DOM
				if (flag) {
					e.stopPropagation();
				}
			}, comp.uid);

			Events.addEvent(dropZone, 'drop', function(e) {
				e.preventDefault();
				var flag = Dom.get(self.uid).dragDrop(e);
				// If handled, then stop propagation of event in DOM
				if (flag) {
					e.stopPropagation();
				}
			}, comp.uid);

			return self.shimExec.call(this, 'FileDrop', 'init');
		}
	};

	return (extensions.FileDrop = FileDrop);
});

// Included from: src/javascript/runtime/silverlight/file/FileReader.js

/**
 * FileReader.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/silverlight/file/FileReader
@private
*/
define("moxie/runtime/silverlight/file/FileReader", [
	"moxie/runtime/silverlight/Runtime",
	"moxie/core/utils/Basic",
	"moxie/runtime/flash/file/FileReader"
], function(extensions, Basic, FileReader) {
	return (extensions.FileReader = Basic.extend({}, FileReader));
});

// Included from: src/javascript/runtime/silverlight/file/FileReaderSync.js

/**
 * FileReaderSync.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/silverlight/file/FileReaderSync
@private
*/
define("moxie/runtime/silverlight/file/FileReaderSync", [
	"moxie/runtime/silverlight/Runtime",
	"moxie/core/utils/Basic",
	"moxie/runtime/flash/file/FileReaderSync"
], function(extensions, Basic, FileReaderSync) {
	return (extensions.FileReaderSync = Basic.extend({}, FileReaderSync));
});

// Included from: src/javascript/runtime/silverlight/xhr/XMLHttpRequest.js

/**
 * XMLHttpRequest.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/silverlight/xhr/XMLHttpRequest
@private
*/
define("moxie/runtime/silverlight/xhr/XMLHttpRequest", [
	"moxie/runtime/silverlight/Runtime",
	"moxie/core/utils/Basic",
	"moxie/runtime/flash/xhr/XMLHttpRequest"
], function(extensions, Basic, XMLHttpRequest) {
	return (extensions.XMLHttpRequest = Basic.extend({}, XMLHttpRequest));
});

// Included from: src/javascript/runtime/silverlight/runtime/Transporter.js

/**
 * Transporter.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/silverlight/runtime/Transporter
@private
*/
define("moxie/runtime/silverlight/runtime/Transporter", [
	"moxie/runtime/silverlight/Runtime",
	"moxie/core/utils/Basic",
	"moxie/runtime/flash/runtime/Transporter"
], function(extensions, Basic, Transporter) {
	return (extensions.Transporter = Basic.extend({}, Transporter));
});

// Included from: src/javascript/runtime/silverlight/image/Image.js

/**
 * Image.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */
 
/**
@class moxie/runtime/silverlight/image/Image
@private
*/
define("moxie/runtime/silverlight/image/Image", [
	"moxie/runtime/silverlight/Runtime",
	"moxie/core/utils/Basic",
	"moxie/runtime/flash/image/Image"
], function(extensions, Basic, Image) {
	return (extensions.Image = Basic.extend({}, Image, {

		getInfo: function() {
			var self = this.getRuntime()
			, grps = ['tiff', 'exif', 'gps']
			, info = { meta: {} }
			, rawInfo = self.shimExec.call(this, 'Image', 'getInfo')
			;

			if (rawInfo.meta) {
				Basic.each(grps, function(grp) {
					var meta = rawInfo.meta[grp]
					, tag
					, i
					, length
					, value
					;
					if (meta && meta.keys) {
						info.meta[grp] = {};
						for (i = 0, length = meta.keys.length; i < length; i++) {
							tag = meta.keys[i];
							value = meta[tag];
							if (value) {
								// convert numbers
								if (/^(\d|[1-9]\d+)$/.test(value)) { // integer (make sure doesn't start with zero)
									value = parseInt(value, 10);
								} else if (/^\d*\.\d+$/.test(value)) { // double
									value = parseFloat(value);
								}
								info.meta[grp][tag] = value;
							}
						}
					}
				});
			}

			info.width = parseInt(rawInfo.width, 10);
			info.height = parseInt(rawInfo.height, 10);
			info.size = parseInt(rawInfo.size, 10);
			info.type = rawInfo.type;
			info.name = rawInfo.name;

			return info;
		}
	}));
});

// Included from: src/javascript/runtime/html4/Runtime.js

/**
 * Runtime.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/*global File:true */

/**
Defines constructor for HTML4 runtime.

@class moxie/runtime/html4/Runtime
@private
*/
define("moxie/runtime/html4/Runtime", [
	"moxie/core/utils/Basic",
	"moxie/core/Exceptions",
	"moxie/runtime/Runtime",
	"moxie/core/utils/Env"
], function(Basic, x, Runtime, Env) {
	
	var type = 'html4', extensions = {};

	function Html4Runtime(options) {
		var I = this
		, Test = Runtime.capTest
		, True = Runtime.capTrue
		;

		Runtime.call(this, options, type, {
			access_binary: Test(window.FileReader || window.File && File.getAsDataURL),
			access_image_binary: false,
			display_media: Test(extensions.Image && (Env.can('create_canvas') || Env.can('use_data_uri_over32kb'))),
			do_cors: false,
			drag_and_drop: false,
			filter_by_extension: Test(function() { // if you know how to feature-detect this, please suggest
				return (Env.browser === 'Chrome' && Env.version >= 28) || (Env.browser === 'IE' && Env.version >= 10);
			}()),
			resize_image: function() {
				return extensions.Image && I.can('access_binary') && Env.can('create_canvas');
			},
			report_upload_progress: false,
			return_response_headers: false,
			return_response_type: function(responseType) {
				if (responseType === 'json' && !!window.JSON) {
					return true;
				} 
				return !!~Basic.inArray(responseType, ['text', 'document', '']);
			},
			return_status_code: function(code) {
				return !Basic.arrayDiff(code, [200, 404]);
			},
			select_file: function() {
				return Env.can('use_fileinput');
			},
			select_multiple: false,
			send_binary_string: false,
			send_custom_headers: false,
			send_multipart: true,
			slice_blob: false,
			stream_upload: function() {
				return I.can('select_file');
			},
			summon_file_dialog: Test(function() { // yeah... some dirty sniffing here...
				return (Env.browser === 'Firefox' && Env.version >= 4) ||
					(Env.browser === 'Opera' && Env.version >= 12) ||
					!!~Basic.inArray(Env.browser, ['Chrome', 'Safari']);
			}()),
			upload_filesize: True,
			use_http_method: function(methods) {
				return !Basic.arrayDiff(methods, ['GET', 'POST']);
			}
		});


		Basic.extend(this, {
			init : function() {
				this.trigger("Init");
			},

			destroy: (function(destroy) { // extend default destroy method
				return function() {
					destroy.call(I);
					destroy = I = null;
				};
			}(this.destroy))
		});

		Basic.extend(this.getShim(), extensions);
	}

	Runtime.addConstructor(type, Html4Runtime);

	return extensions;
});

// Included from: src/javascript/runtime/html4/file/FileInput.js

/**
 * FileInput.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/html4/file/FileInput
@private
*/
define("moxie/runtime/html4/file/FileInput", [
	"moxie/runtime/html4/Runtime",
	"moxie/core/utils/Basic",
	"moxie/core/utils/Dom",
	"moxie/core/utils/Events",
	"moxie/core/utils/Mime",
	"moxie/core/utils/Env"
], function(extensions, Basic, Dom, Events, Mime, Env) {
	
	function FileInput() {
		var _uid, _files = [], _mimes = [], _options;

		function addInput() {
			var comp = this, I = comp.getRuntime(), shimContainer, browseButton, currForm, form, input, uid;

			uid = Basic.guid('uid_');

			shimContainer = I.getShimContainer(); // we get new ref everytime to avoid memory leaks in IE

			if (_uid) { // move previous form out of the view
				currForm = Dom.get(_uid + '_form');
				if (currForm) {
					Basic.extend(currForm.style, { top: '100%' });
				}
			}

			// build form in DOM, since innerHTML version not able to submit file for some reason
			form = document.createElement('form');
			form.setAttribute('id', uid + '_form');
			form.setAttribute('method', 'post');
			form.setAttribute('enctype', 'multipart/form-data');
			form.setAttribute('encoding', 'multipart/form-data');

			Basic.extend(form.style, {
				overflow: 'hidden',
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%'
			});

			input = document.createElement('input');
			input.setAttribute('id', uid);
			input.setAttribute('type', 'file');
			input.setAttribute('name', _options.name || 'Filedata');
			input.setAttribute('accept', _mimes.join(','));

			Basic.extend(input.style, {
				fontSize: '999px',
				opacity: 0
			});

			form.appendChild(input);
			shimContainer.appendChild(form);

			// prepare file input to be placed underneath the browse_button element
			Basic.extend(input.style, {
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%'
			});

			if (Env.browser === 'IE' && Env.version < 10) {
				Basic.extend(input.style, {
					filter : "progid:DXImageTransform.Microsoft.Alpha(opacity=0)"
				});
			}

			input.onchange = function() { // there should be only one handler for this
				var file;

				if (!this.value) {
					return;
				}

				if (this.files) {
					file = this.files[0];
				} else {
					file = {
						name: this.value
					};
				}

				_files = [file];

				this.onchange = function() {}; // clear event handler
				addInput.call(comp);

				// after file is initialized as o.File, we need to update form and input ids
				comp.bind('change', function onChange() {
					var input = Dom.get(uid), form = Dom.get(uid + '_form'), file;

					comp.unbind('change', onChange);

					if (comp.files.length && input && form) {
						file = comp.files[0];

						input.setAttribute('id', file.uid);
						form.setAttribute('id', file.uid + '_form');

						// set upload target
						form.setAttribute('target', file.uid + '_iframe');
					}
					input = form = null;
				}, 998);

				input = form = null;
				comp.trigger('change');
			};


			// route click event to the input
			if (I.can('summon_file_dialog')) {
				browseButton = Dom.get(_options.browse_button);
				Events.removeEvent(browseButton, 'click', comp.uid);
				Events.addEvent(browseButton, 'click', function(e) {
					if (input && !input.disabled) { // for some reason FF (up to 8.0.1 so far) lets to click disabled input[type=file]
						input.click();
					}
					e.preventDefault();
				}, comp.uid);
			}

			_uid = uid;

			shimContainer = currForm = browseButton = null;
		}

		Basic.extend(this, {
			init: function(options) {
				var comp = this, I = comp.getRuntime(), shimContainer;

				// figure out accept string
				_options = options;
				_mimes = options.accept.mimes || Mime.extList2mimes(options.accept, I.can('filter_by_extension'));

				shimContainer = I.getShimContainer();

				(function() {
					var browseButton, zIndex, top;

					browseButton = Dom.get(options.browse_button);

					// Route click event to the input[type=file] element for browsers that support such behavior
					if (I.can('summon_file_dialog')) {
						if (Dom.getStyle(browseButton, 'position') === 'static') {
							browseButton.style.position = 'relative';
						}

						zIndex = parseInt(Dom.getStyle(browseButton, 'z-index'), 10) || 1;

						browseButton.style.zIndex = zIndex;
						shimContainer.style.zIndex = zIndex - 1;
					}

					/* Since we have to place input[type=file] on top of the browse_button for some browsers,
					browse_button loses interactivity, so we restore it here */
					top = I.can('summon_file_dialog') ? browseButton : shimContainer;

					Events.addEvent(top, 'mouseover', function() {
						comp.trigger('mouseenter');
					}, comp.uid);

					Events.addEvent(top, 'mouseout', function() {
						comp.trigger('mouseleave');
					}, comp.uid);

					Events.addEvent(top, 'mousedown', function() {
						comp.trigger('mousedown');
					}, comp.uid);

					Events.addEvent(Dom.get(options.container), 'mouseup', function() {
						comp.trigger('mouseup');
					}, comp.uid);

					browseButton = null;
				}());

				addInput.call(this);

				shimContainer = null;

				// trigger ready event asynchronously
				comp.trigger({
					type: 'ready',
					async: true
				});
			},

			getFiles: function() {
				return _files;
			},

			disable: function(state) {
				var input;

				if ((input = Dom.get(_uid))) {
					input.disabled = !!state;
				}
			},

			destroy: function() {
				var I = this.getRuntime()
				, shim = I.getShim()
				, shimContainer = I.getShimContainer()
				;
				
				Events.removeAllEvents(shimContainer, this.uid);
				Events.removeAllEvents(_options && Dom.get(_options.container), this.uid);
				Events.removeAllEvents(_options && Dom.get(_options.browse_button), this.uid);
				
				if (shimContainer) {
					shimContainer.innerHTML = '';
				}

				shim.removeInstance(this.uid);

				_uid = _files = _mimes = _options = shimContainer = shim = null;
			}
		});
	}

	return (extensions.FileInput = FileInput);
});

// Included from: src/javascript/runtime/html4/file/FileReader.js

/**
 * FileReader.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/html4/file/FileReader
@private
*/
define("moxie/runtime/html4/file/FileReader", [
	"moxie/runtime/html4/Runtime",
	"moxie/runtime/html5/file/FileReader"
], function(extensions, FileReader) {
	return (extensions.FileReader = FileReader);
});

// Included from: src/javascript/runtime/html4/xhr/XMLHttpRequest.js

/**
 * XMLHttpRequest.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/html4/xhr/XMLHttpRequest
@private
*/
define("moxie/runtime/html4/xhr/XMLHttpRequest", [
	"moxie/runtime/html4/Runtime",
	"moxie/core/utils/Basic",
	"moxie/core/utils/Dom",
	"moxie/core/utils/Url",
	"moxie/core/Exceptions",
	"moxie/core/utils/Events",
	"moxie/file/Blob",
	"moxie/xhr/FormData"
], function(extensions, Basic, Dom, Url, x, Events, Blob, FormData) {
	
	function XMLHttpRequest() {
		var _status, _response, _iframe;

		function cleanup(cb) {
			var target = this, uid, form, inputs, i, hasFile = false;

			if (!_iframe) {
				return;
			}

			uid = _iframe.id.replace(/_iframe$/, '');

			form = Dom.get(uid + '_form');
			if (form) {
				inputs = form.getElementsByTagName('input');
				i = inputs.length;

				while (i--) {
					switch (inputs[i].getAttribute('type')) {
						case 'hidden':
							inputs[i].parentNode.removeChild(inputs[i]);
							break;
						case 'file':
							hasFile = true; // flag the case for later
							break;
					}
				}
				inputs = [];

				if (!hasFile) { // we need to keep the form for sake of possible retries
					form.parentNode.removeChild(form);
				}
				form = null;
			}

			// without timeout, request is marked as canceled (in console)
			setTimeout(function() {
				Events.removeEvent(_iframe, 'load', target.uid);
				if (_iframe.parentNode) { // #382
					_iframe.parentNode.removeChild(_iframe);
				}

				// check if shim container has any other children, if - not, remove it as well
				var shimContainer = target.getRuntime().getShimContainer();
				if (!shimContainer.children.length) {
					shimContainer.parentNode.removeChild(shimContainer);
				}

				shimContainer = _iframe = null;
				cb();
			}, 1);
		}

		Basic.extend(this, {
			send: function(meta, data) {
				var target = this, I = target.getRuntime(), uid, form, input, blob;

				_status = _response = null;

				function createIframe() {
					var container = I.getShimContainer() || document.body
					, temp = document.createElement('div')
					;

					// IE 6 won't be able to set the name using setAttribute or iframe.name
					temp.innerHTML = '<iframe id="' + uid + '_iframe" name="' + uid + '_iframe" src="javascript:&quot;&quot;" style="display:none"></iframe>';
					_iframe = temp.firstChild;
					container.appendChild(_iframe);

					/* _iframe.onreadystatechange = function() {
						console.info(_iframe.readyState);
					};*/

					Events.addEvent(_iframe, 'load', function() { // _iframe.onload doesn't work in IE lte 8
						var el;

						try {
							el = _iframe.contentWindow.document || _iframe.contentDocument || window.frames[_iframe.id].document;

							// try to detect some standard error pages
							if (/^4(0[0-9]|1[0-7]|2[2346])\s/.test(el.title)) { // test if title starts with 4xx HTTP error
								_status = el.title.replace(/^(\d+).*$/, '$1');
							} else {
								_status = 200;
								// get result
								_response = Basic.trim(el.body.innerHTML);

								// we need to fire these at least once
								target.trigger({
									type: 'progress',
									loaded: _response.length,
									total: _response.length
								});

								if (blob) { // if we were uploading a file
									target.trigger({
										type: 'uploadprogress',
										loaded: blob.size || 1025,
										total: blob.size || 1025
									});
								}
							}
						} catch (ex) {
							if (Url.hasSameOrigin(meta.url)) {
								// if response is sent with error code, iframe in IE gets redirected to res://ieframe.dll/http_x.htm
								// which obviously results to cross domain error (wtf?)
								_status = 404;
							} else {
								cleanup.call(target, function() {
									target.trigger('error');
								});
								return;
							}
						}	
					
						cleanup.call(target, function() {
							target.trigger('load');
						});
					}, target.uid);
				} // end createIframe

				// prepare data to be sent and convert if required
				if (data instanceof FormData && data.hasBlob()) {
					blob = data.getBlob();
					uid = blob.uid;
					input = Dom.get(uid);
					form = Dom.get(uid + '_form');
					if (!form) {
						throw new x.DOMException(x.DOMException.NOT_FOUND_ERR);
					}
				} else {
					uid = Basic.guid('uid_');

					form = document.createElement('form');
					form.setAttribute('id', uid + '_form');
					form.setAttribute('method', meta.method);
					form.setAttribute('enctype', 'multipart/form-data');
					form.setAttribute('encoding', 'multipart/form-data');
					form.setAttribute('target', uid + '_iframe');

					I.getShimContainer().appendChild(form);
				}

				if (data instanceof FormData) {
					data.each(function(value, name) {
						if (value instanceof Blob) {
							if (input) {
								input.setAttribute('name', name);
							}
						} else {
							var hidden = document.createElement('input');

							Basic.extend(hidden, {
								type : 'hidden',
								name : name,
								value : value
							});

							// make sure that input[type="file"], if it's there, comes last
							if (input) {
								form.insertBefore(hidden, input);
							} else {
								form.appendChild(hidden);
							}
						}
					});
				}

				// set destination url
				form.setAttribute("action", meta.url);

				createIframe();
				form.submit();
				target.trigger('loadstart');
			},

			getStatus: function() {
				return _status;
			},

			getResponse: function(responseType) {
				if ('json' === responseType) {
					// strip off <pre>..</pre> tags that might be enclosing the response
					if (Basic.typeOf(_response) === 'string' && !!window.JSON) {
						try {
							return JSON.parse(_response.replace(/^\s*<pre[^>]*>/, '').replace(/<\/pre>\s*$/, ''));
						} catch (ex) {
							return null;
						}
					} 
				} else if ('document' === responseType) {

				}
				return _response;
			},

			abort: function() {
				var target = this;

				if (_iframe && _iframe.contentWindow) {
					if (_iframe.contentWindow.stop) { // FireFox/Safari/Chrome
						_iframe.contentWindow.stop();
					} else if (_iframe.contentWindow.document.execCommand) { // IE
						_iframe.contentWindow.document.execCommand('Stop');
					} else {
						_iframe.src = "about:blank";
					}
				}

				cleanup.call(this, function() {
					// target.dispatchEvent('readystatechange');
					target.dispatchEvent('abort');
				});
			}
		});
	}

	return (extensions.XMLHttpRequest = XMLHttpRequest);
});

// Included from: src/javascript/runtime/html4/image/Image.js

/**
 * Image.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/html4/image/Image
@private
*/
define("moxie/runtime/html4/image/Image", [
	"moxie/runtime/html4/Runtime",
	"moxie/runtime/html5/image/Image"
], function(extensions, Image) {
	return (extensions.Image = Image);
});

expose(["moxie/core/utils/Basic","moxie/core/I18n","moxie/core/utils/Mime","moxie/core/utils/Env","moxie/core/utils/Dom","moxie/core/Exceptions","moxie/core/EventTarget","moxie/core/utils/Encode","moxie/runtime/Runtime","moxie/runtime/RuntimeClient","moxie/file/Blob","moxie/file/File","moxie/file/FileInput","moxie/file/FileDrop","moxie/runtime/RuntimeTarget","moxie/file/FileReader","moxie/core/utils/Url","moxie/file/FileReaderSync","moxie/xhr/FormData","moxie/xhr/XMLHttpRequest","moxie/runtime/Transporter","moxie/image/Image","moxie/core/utils/Events"]);
})(this);/**
 * o.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/*global moxie:true */

/**
Globally exposed namespace with the most frequently used public classes and handy methods.

@class o
@static
@private
*/
(function() {
	"use strict";

	var o = {}, inArray = moxie.core.utils.Basic.inArray;

	// directly add some public classes
	// (we do it dynamically here, since for custom builds we cannot know beforehand what modules were included)
	(function addAlias(ns) {
		var name, itemType;
		for (name in ns) {
			itemType = typeof(ns[name]);
			if (itemType === 'object' && !~inArray(name, ['Exceptions', 'Env', 'Mime'])) {
				addAlias(ns[name]);
			} else if (itemType === 'function') {
				o[name] = ns[name];
			}
		}
	})(window.moxie);

	// add some manually
	o.Env = window.moxie.core.utils.Env;
	o.Mime = window.moxie.core.utils.Mime;
	o.Exceptions = window.moxie.core.Exceptions;

	// expose globally
	window.mOxie = o;
	if (!window.o) {
		window.o = o;
	}
	return o;
})();
/**
 * Plupload - multi-runtime File Uploader
 * v2.1.1
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 *
 * Date: 2014-01-16
 */
/**
 * Plupload.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/*global mOxie:true */

;(function(window, o, undef) {

var delay = window.setTimeout
, fileFilters = {}
;

// convert plupload features to caps acceptable by mOxie
function normalizeCaps(settings) {		
	var features = settings.required_features, caps = {};

	function resolve(feature, value, strict) {
		// Feature notation is deprecated, use caps (this thing here is required for backward compatibility)
		var map = { 
			chunks: 'slice_blob',
			jpgresize: 'send_binary_string',
			pngresize: 'send_binary_string',
			progress: 'report_upload_progress',
			multi_selection: 'select_multiple',
			dragdrop: 'drag_and_drop',
			drop_element: 'drag_and_drop',
			headers: 'send_custom_headers',
			canSendBinary: 'send_binary',
			triggerDialog: 'summon_file_dialog'
		};

		if (map[feature]) {
			caps[map[feature]] = value;
		} else if (!strict) {
			caps[feature] = value;
		}
	}

	if (typeof(features) === 'string') {
		plupload.each(features.split(/\s*,\s*/), function(feature) {
			resolve(feature, true);
		});
	} else if (typeof(features) === 'object') {
		plupload.each(features, function(value, feature) {
			resolve(feature, value);
		});
	} else if (features === true) {
		// check settings for required features
		if (!settings.multipart) { // special care for multipart: false
			caps.send_binary_string = true;
		}

		if (settings.chunk_size > 0) {
			caps.slice_blob = true;
		}

		if (settings.resize.enabled) {
			caps.send_binary_string = true;
		}
		
		plupload.each(settings, function(value, feature) {
			resolve(feature, !!value, true); // strict check
		});
	}
	
	return caps;
}

/** 
 * @module plupload	
 * @static
 */
var plupload = {
	/**
	 * Plupload version will be replaced on build.
	 *
	 * @property VERSION
	 * @for Plupload
	 * @static
	 * @final
	 */
	VERSION : '2.1.1',

	/**
	 * Inital state of the queue and also the state ones it's finished all it's uploads.
	 *
	 * @property STOPPED
	 * @static
	 * @final
	 */
	STOPPED : 1,

	/**
	 * Upload process is running
	 *
	 * @property STARTED
	 * @static
	 * @final
	 */
	STARTED : 2,

	/**
	 * File is queued for upload
	 *
	 * @property QUEUED
	 * @static
	 * @final
	 */
	QUEUED : 1,

	/**
	 * File is being uploaded
	 *
	 * @property UPLOADING
	 * @static
	 * @final
	 */
	UPLOADING : 2,

	/**
	 * File has failed to be uploaded
	 *
	 * @property FAILED
	 * @static
	 * @final
	 */
	FAILED : 4,

	/**
	 * File has been uploaded successfully
	 *
	 * @property DONE
	 * @static
	 * @final
	 */
	DONE : 5,

	// Error constants used by the Error event

	/**
	 * Generic error for example if an exception is thrown inside Silverlight.
	 *
	 * @property GENERIC_ERROR
	 * @static
	 * @final
	 */
	GENERIC_ERROR : -100,

	/**
	 * HTTP transport error. For example if the server produces a HTTP status other than 200.
	 *
	 * @property HTTP_ERROR
	 * @static
	 * @final
	 */
	HTTP_ERROR : -200,

	/**
	 * Generic I/O error. For exampe if it wasn't possible to open the file stream on local machine.
	 *
	 * @property IO_ERROR
	 * @static
	 * @final
	 */
	IO_ERROR : -300,

	/**
	 * Generic I/O error. For exampe if it wasn't possible to open the file stream on local machine.
	 *
	 * @property SECURITY_ERROR
	 * @static
	 * @final
	 */
	SECURITY_ERROR : -400,

	/**
	 * Initialization error. Will be triggered if no runtime was initialized.
	 *
	 * @property INIT_ERROR
	 * @static
	 * @final
	 */
	INIT_ERROR : -500,

	/**
	 * File size error. If the user selects a file that is too large it will be blocked and an error of this type will be triggered.
	 *
	 * @property FILE_SIZE_ERROR
	 * @static
	 * @final
	 */
	FILE_SIZE_ERROR : -600,

	/**
	 * File extension error. If the user selects a file that isn't valid according to the filters setting.
	 *
	 * @property FILE_EXTENSION_ERROR
	 * @static
	 * @final
	 */
	FILE_EXTENSION_ERROR : -601,

	/**
	 * Duplicate file error. If prevent_duplicates is set to true and user selects the same file again.
	 *
	 * @property FILE_DUPLICATE_ERROR
	 * @static
	 * @final
	 */
	FILE_DUPLICATE_ERROR : -602,

	/**
	 * Runtime will try to detect if image is proper one. Otherwise will throw this error.
	 *
	 * @property IMAGE_FORMAT_ERROR
	 * @static
	 * @final
	 */
	IMAGE_FORMAT_ERROR : -700,

	/**
	 * While working on the image runtime will try to detect if the operation may potentially run out of memeory and will throw this error.
	 *
	 * @property IMAGE_MEMORY_ERROR
	 * @static
	 * @final
	 */
	IMAGE_MEMORY_ERROR : -701,

	/**
	 * Each runtime has an upper limit on a dimension of the image it can handle. If bigger, will throw this error.
	 *
	 * @property IMAGE_DIMENSIONS_ERROR
	 * @static
	 * @final
	 */
	IMAGE_DIMENSIONS_ERROR : -702,

	/**
	 * Mime type lookup table.
	 *
	 * @property mimeTypes
	 * @type Object
	 * @final
	 */
	mimeTypes : o.mimes,

	/**
	 * In some cases sniffing is the only way around :(
	 */
	ua: o.ua,

	/**
	 * Gets the true type of the built-in object (better version of typeof).
	 * @credits Angus Croll (http://javascriptweblog.wordpress.com/)
	 *
	 * @method typeOf
	 * @static
	 * @param {Object} o Object to check.
	 * @return {String} Object [[Class]]
	 */
	typeOf: o.typeOf,

	/**
	 * Extends the specified object with another object.
	 *
	 * @method extend
	 * @static
	 * @param {Object} target Object to extend.
	 * @param {Object..} obj Multiple objects to extend with.
	 * @return {Object} Same as target, the extended object.
	 */
	extend : o.extend,

	/**
	 * Generates an unique ID. This is 99.99% unique since it takes the current time and 5 random numbers.
	 * The only way a user would be able to get the same ID is if the two persons at the same exact milisecond manages
	 * to get 5 the same random numbers between 0-65535 it also uses a counter so each call will be guaranteed to be page unique.
	 * It's more probable for the earth to be hit with an ansteriod. You can also if you want to be 100% sure set the plupload.guidPrefix property
	 * to an user unique key.
	 *
	 * @method guid
	 * @static
	 * @return {String} Virtually unique id.
	 */
	guid : o.guid,

	/**
	 * Get array of DOM Elements by their ids.
	 * 
	 * @method get
	 * @for Utils
	 * @param {String} id Identifier of the DOM Element
	 * @return {Array}
	*/
	get : function get(ids) {
		var els = [], el;

		if (o.typeOf(ids) !== 'array') {
			ids = [ids];
		}

		var i = ids.length;
		while (i--) {
			el = o.get(ids[i]);
			if (el) {
				els.push(el);
			}
		}

		return els.length ? els : null;
	},

	/**
	 * Executes the callback function for each item in array/object. If you return false in the
	 * callback it will break the loop.
	 *
	 * @method each
	 * @static
	 * @param {Object} obj Object to iterate.
	 * @param {function} callback Callback function to execute for each item.
	 */
	each : o.each,

	/**
	 * Returns the absolute x, y position of an Element. The position will be returned in a object with x, y fields.
	 *
	 * @method getPos
	 * @static
	 * @param {Element} node HTML element or element id to get x, y position from.
	 * @param {Element} root Optional root element to stop calculations at.
	 * @return {object} Absolute position of the specified element object with x, y fields.
	 */
	getPos : o.getPos,

	/**
	 * Returns the size of the specified node in pixels.
	 *
	 * @method getSize
	 * @static
	 * @param {Node} node Node to get the size of.
	 * @return {Object} Object with a w and h property.
	 */
	getSize : o.getSize,

	/**
	 * Encodes the specified string.
	 *
	 * @method xmlEncode
	 * @static
	 * @param {String} s String to encode.
	 * @return {String} Encoded string.
	 */
	xmlEncode : function(str) {
		var xmlEncodeChars = {'<' : 'lt', '>' : 'gt', '&' : 'amp', '"' : 'quot', '\'' : '#39'}, xmlEncodeRegExp = /[<>&\"\']/g;

		return str ? ('' + str).replace(xmlEncodeRegExp, function(chr) {
			return xmlEncodeChars[chr] ? '&' + xmlEncodeChars[chr] + ';' : chr;
		}) : str;
	},

	/**
	 * Forces anything into an array.
	 *
	 * @method toArray
	 * @static
	 * @param {Object} obj Object with length field.
	 * @return {Array} Array object containing all items.
	 */
	toArray : o.toArray,

	/**
	 * Find an element in array and return it's index if present, otherwise return -1.
	 *
	 * @method inArray
	 * @static
	 * @param {mixed} needle Element to find
	 * @param {Array} array
	 * @return {Int} Index of the element, or -1 if not found
	 */
	inArray : o.inArray,

	/**
	 * Extends the language pack object with new items.
	 *
	 * @method addI18n
	 * @static
	 * @param {Object} pack Language pack items to add.
	 * @return {Object} Extended language pack object.
	 */
	addI18n : o.addI18n,

	/**
	 * Translates the specified string by checking for the english string in the language pack lookup.
	 *
	 * @method translate
	 * @static
	 * @param {String} str String to look for.
	 * @return {String} Translated string or the input string if it wasn't found.
	 */
	translate : o.translate,

	/**
	 * Checks if object is empty.
	 *
	 * @method isEmptyObj
	 * @static
	 * @param {Object} obj Object to check.
	 * @return {Boolean}
	 */
	isEmptyObj : o.isEmptyObj,

	/**
	 * Checks if specified DOM element has specified class.
	 *
	 * @method hasClass
	 * @static
	 * @param {Object} obj DOM element like object to add handler to.
	 * @param {String} name Class name
	 */
	hasClass : o.hasClass,

	/**
	 * Adds specified className to specified DOM element.
	 *
	 * @method addClass
	 * @static
	 * @param {Object} obj DOM element like object to add handler to.
	 * @param {String} name Class name
	 */
	addClass : o.addClass,

	/**
	 * Removes specified className from specified DOM element.
	 *
	 * @method removeClass
	 * @static
	 * @param {Object} obj DOM element like object to add handler to.
	 * @param {String} name Class name
	 */
	removeClass : o.removeClass,

	/**
	 * Returns a given computed style of a DOM element.
	 *
	 * @method getStyle
	 * @static
	 * @param {Object} obj DOM element like object.
	 * @param {String} name Style you want to get from the DOM element
	 */
	getStyle : o.getStyle,

	/**
	 * Adds an event handler to the specified object and store reference to the handler
	 * in objects internal Plupload registry (@see removeEvent).
	 *
	 * @method addEvent
	 * @static
	 * @param {Object} obj DOM element like object to add handler to.
	 * @param {String} name Name to add event listener to.
	 * @param {Function} callback Function to call when event occurs.
	 * @param {String} (optional) key that might be used to add specifity to the event record.
	 */
	addEvent : o.addEvent,

	/**
	 * Remove event handler from the specified object. If third argument (callback)
	 * is not specified remove all events with the specified name.
	 *
	 * @method removeEvent
	 * @static
	 * @param {Object} obj DOM element to remove event listener(s) from.
	 * @param {String} name Name of event listener to remove.
	 * @param {Function|String} (optional) might be a callback or unique key to match.
	 */
	removeEvent: o.removeEvent,

	/**
	 * Remove all kind of events from the specified object
	 *
	 * @method removeAllEvents
	 * @static
	 * @param {Object} obj DOM element to remove event listeners from.
	 * @param {String} (optional) unique key to match, when removing events.
	 */
	removeAllEvents: o.removeAllEvents,

	/**
	 * Cleans the specified name from national characters (diacritics). The result will be a name with only a-z, 0-9 and _.
	 *
	 * @method cleanName
	 * @static
	 * @param {String} s String to clean up.
	 * @return {String} Cleaned string.
	 */
	cleanName : function(name) {
		var i, lookup;

		// Replace diacritics
		lookup = [
			/[\300-\306]/g, 'A', /[\340-\346]/g, 'a',
			/\307/g, 'C', /\347/g, 'c',
			/[\310-\313]/g, 'E', /[\350-\353]/g, 'e',
			/[\314-\317]/g, 'I', /[\354-\357]/g, 'i',
			/\321/g, 'N', /\361/g, 'n',
			/[\322-\330]/g, 'O', /[\362-\370]/g, 'o',
			/[\331-\334]/g, 'U', /[\371-\374]/g, 'u'
		];

		for (i = 0; i < lookup.length; i += 2) {
			name = name.replace(lookup[i], lookup[i + 1]);
		}

		// Replace whitespace
		name = name.replace(/\s+/g, '_');

		// Remove anything else
		name = name.replace(/[^a-z0-9_\-\.]+/gi, '');

		return name;
	},

	/**
	 * Builds a full url out of a base URL and an object with items to append as query string items.
	 *
	 * @method buildUrl
	 * @static
	 * @param {String} url Base URL to append query string items to.
	 * @param {Object} items Name/value object to serialize as a querystring.
	 * @return {String} String with url + serialized query string items.
	 */
	buildUrl : function(url, items) {
		var query = '';

		plupload.each(items, function(value, name) {
			query += (query ? '&' : '') + encodeURIComponent(name) + '=' + encodeURIComponent(value);
		});

		if (query) {
			url += (url.indexOf('?') > 0 ? '&' : '?') + query;
		}

		return url;
	},

	/**
	 * Formats the specified number as a size string for example 1024 becomes 1 KB.
	 *
	 * @method formatSize
	 * @static
	 * @param {Number} size Size to format as string.
	 * @return {String} Formatted size string.
	 */
	formatSize : function(size) {

		if (size === undef || /\D/.test(size)) {
			return plupload.translate('N/A');
		}

		function round(num, precision) {
			return Math.round(num * Math.pow(10, precision)) / Math.pow(10, precision);
		}

		var boundary = Math.pow(1024, 4);

		// TB
		if (size > boundary) {
			return round(size / boundary, 1) + " " + plupload.translate('tb');
		}

		// GB
		if (size > (boundary/=1024)) {
			return round(size / boundary, 1) + " " + plupload.translate('gb');
		}

		// MB
		if (size > (boundary/=1024)) {
			return round(size / boundary, 1) + " " + plupload.translate('mb');
		}

		// KB
		if (size > 1024) {
			return Math.round(size / 1024) + " " + plupload.translate('kb');
		}

		return size + " " + plupload.translate('b');
	},


	/**
	 * Parses the specified size string into a byte value. For example 10kb becomes 10240.
	 *
	 * @method parseSize
	 * @static
	 * @param {String|Number} size String to parse or number to just pass through.
	 * @return {Number} Size in bytes.
	 */
	parseSize : o.parseSizeStr,


	/**
	 * A way to predict what runtime will be choosen in the current environment with the
	 * specified settings.
	 *
	 * @method predictRuntime
	 * @static
	 * @param {Object|String} config Plupload settings to check
	 * @param {String} [runtimes] Comma-separated list of runtimes to check against
	 * @return {String} Type of compatible runtime
	 */
	predictRuntime : function(config, runtimes) {
		var up, runtime;

		up = new plupload.Uploader(config);
		runtime = o.Runtime.thatCan(up.getOption().required_features, runtimes || config.runtimes);
		up.destroy();
		return runtime;
	},

	/**
	 * Registers a filter that will be executed for each file added to the queue.
	 * If callback returns false, file will not be added.
	 *
	 * Callback receives two arguments: a value for the filter as it was specified in settings.filters
	 * and a file to be filtered. Callback is executed in the context of uploader instance.
	 *
	 * @method addFileFilter
	 * @static
	 * @param {String} name Name of the filter by which it can be referenced in settings.filters
	 * @param {String} cb Callback - the actual routine that every added file must pass
	 */
	addFileFilter: function(name, cb) {
		fileFilters[name] = cb;
	}
};


plupload.addFileFilter('mime_types', function(filters, file, cb) {
	if (filters.length && !filters.regexp.test(file.name)) {
		this.trigger('Error', {
			code : plupload.FILE_EXTENSION_ERROR,
			message : plupload.translate('File extension error.'),
			file : file
		});
		cb(false);
	} else {
		cb(true);
	}
});


plupload.addFileFilter('max_file_size', function(maxSize, file, cb) {
	var undef;

	maxSize = plupload.parseSize(maxSize);

	// Invalid file size
	if (file.size !== undef && maxSize && file.size > maxSize) {
		this.trigger('Error', {
			code : plupload.FILE_SIZE_ERROR,
			message : plupload.translate('File size error.'),
			file : file
		});
		cb(false);
	} else {
		cb(true);
	}
});


plupload.addFileFilter('prevent_duplicates', function(value, file, cb) {
	if (value) {
		var ii = this.files.length;
		while (ii--) {
			// Compare by name and size (size might be 0 or undefined, but still equivalent for both)
			if (file.name === this.files[ii].name && file.size === this.files[ii].size) {
				this.trigger('Error', {
					code : plupload.FILE_DUPLICATE_ERROR,
					message : plupload.translate('Duplicate file error.'),
					file : file
				});
				cb(false);
				return;
			}
		}
	}
	cb(true);
});


/**
@class Uploader
@constructor

@param {Object} settings For detailed information about each option check documentation.
	@param {String|DOMElement} settings.browse_button id of the DOM element or DOM element itself to use as file dialog trigger.
	@param {String} settings.url URL of the server-side upload handler.
	@param {Number|String} [settings.chunk_size=0] Chunk size in bytes to slice the file into. Shorcuts with b, kb, mb, gb, tb suffixes also supported. `e.g. 204800 or "204800b" or "200kb"`. By default - disabled.
	@param {String} [settings.container] id of the DOM element to use as a container for uploader structures. Defaults to document.body.
	@param {String|DOMElement} [settings.drop_element] id of the DOM element or DOM element itself to use as a drop zone for Drag-n-Drop.
	@param {String} [settings.file_data_name="file"] Name for the file field in Multipart formated message.
	@param {Object} [settings.filters={}] Set of file type filters.
		@param {Array} [settings.filters.mime_types=[]] List of file types to accept, each one defined by title and list of extensions. `e.g. {title : "Image files", extensions : "jpg,jpeg,gif,png"}`. Dispatches `plupload.FILE_EXTENSION_ERROR`
		@param {String|Number} [settings.filters.max_file_size=0] Maximum file size that the user can pick, in bytes. Optionally supports b, kb, mb, gb, tb suffixes. `e.g. "10mb" or "1gb"`. By default - not set. Dispatches `plupload.FILE_SIZE_ERROR`.
		@param {Boolean} [settings.filters.prevent_duplicates=false] Do not let duplicates into the queue. Dispatches `plupload.FILE_DUPLICATE_ERROR`.
	@param {String} [settings.flash_swf_url] URL of the Flash swf.
	@param {Object} [settings.headers] Custom headers to send with the upload. Hash of name/value pairs.
	@param {Number} [settings.max_retries=0] How many times to retry the chunk or file, before triggering Error event.
	@param {Boolean} [settings.multipart=true] Whether to send file and additional parameters as Multipart formated message.
	@param {Object} [settings.multipart_params] Hash of key/value pairs to send with every file upload.
	@param {Boolean} [settings.multi_selection=true] Enable ability to select multiple files at once in file dialog.
	@param {String|Object} [settings.required_features] Either comma-separated list or hash of required features that chosen runtime should absolutely possess.
	@param {Object} [settings.resize] Enable resizng of images on client-side. Applies to `image/jpeg` and `image/png` only. `e.g. {width : 200, height : 200, quality : 90, crop: true}`
		@param {Number} [settings.resize.width] If image is bigger, it will be resized.
		@param {Number} [settings.resize.height] If image is bigger, it will be resized.
		@param {Number} [settings.resize.quality=90] Compression quality for jpegs (1-100).
		@param {Boolean} [settings.resize.crop=false] Whether to crop images to exact dimensions. By default they will be resized proportionally.
	@param {String} [settings.runtimes="html5,flash,silverlight,html4"] Comma separated list of runtimes, that Plupload will try in turn, moving to the next if previous fails.
	@param {String} [settings.silverlight_xap_url] URL of the Silverlight xap.
	@param {Boolean} [settings.unique_names=false] If true will generate unique filenames for uploaded files.
*/
plupload.Uploader = function(options) {
	/**
	 * Fires when the current RunTime has been initialized.
	 *
	 * @event Init
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 */

	/**
	 * Fires after the init event incase you need to perform actions there.
	 *
	 * @event PostInit
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 */

	/**
	 * Fires when the option is changed in via uploader.setOption().
	 *
	 * @event OptionChanged
	 * @since 2.1
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {String} name Name of the option that was changed
	 * @param {Mixed} value New value for the specified option
	 * @param {Mixed} oldValue Previous value of the option
	 */

	/**
	 * Fires when the silverlight/flash or other shim needs to move.
	 *
	 * @event Refresh
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 */

	/**
	 * Fires when the overall state is being changed for the upload queue.
	 *
	 * @event StateChanged
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 */

	/**
	 * Fires when a file is to be uploaded by the runtime.
	 *
	 * @event UploadFile
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {plupload.File} file File to be uploaded.
	 */

	/**
	 * Fires when just before a file is uploaded. This event enables you to override settings
	 * on the uploader instance before the file is uploaded.
	 *
	 * @event BeforeUpload
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {plupload.File} file File to be uploaded.
	 */

	/**
	 * Fires when the file queue is changed. In other words when files are added/removed to the files array of the uploader instance.
	 *
	 * @event QueueChanged
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 */

	/**
	 * Fires while a file is being uploaded. Use this event to update the current file upload progress.
	 *
	 * @event UploadProgress
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {plupload.File} file File that is currently being uploaded.
	 */

	/**
	 * Fires when file is removed from the queue.
	 *
	 * @event FilesRemoved
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {Array} files Array of files that got removed.
	 */

	/**
	 * Fires for every filtered file before it is added to the queue.
	 * 
	 * @event FileFiltered
	 * @since 2.1
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {plupload.File} file Another file that has to be added to the queue.
	 */

	/**
	 * Fires after files were filtered and added to the queue.
	 *
	 * @event FilesAdded
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {Array} files Array of file objects that were added to queue by the user.
	 */

	/**
	 * Fires when a file is successfully uploaded.
	 *
	 * @event FileUploaded
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {plupload.File} file File that was uploaded.
	 * @param {Object} response Object with response properties.
	 */

	/**
	 * Fires when file chunk is uploaded.
	 *
	 * @event ChunkUploaded
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {plupload.File} file File that the chunk was uploaded for.
	 * @param {Object} response Object with response properties.
	 */

	/**
	 * Fires when all files in a queue are uploaded.
	 *
	 * @event UploadComplete
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {Array} files Array of file objects that was added to queue/selected by the user.
	 */

	/**
	 * Fires when a error occurs.
	 *
	 * @event Error
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {Object} error Contains code, message and sometimes file and other details.
	 */

	/**
	 * Fires when destroy method is called.
	 *
	 * @event Destroy
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 */
	var uid = plupload.guid()
	, settings
	, files = []
	, preferred_caps = {}
	, fileInputs = []
	, fileDrops = []
	, startTime
	, total
	, disabled = false
	, xhr
	;


	// Private methods
	function uploadNext() {
		var file, count = 0, i;

		if (this.state == plupload.STARTED) {
			// Find first QUEUED file
			for (i = 0; i < files.length; i++) {
				if (!file && files[i].status == plupload.QUEUED) {
					file = files[i];
					if (this.trigger("BeforeUpload", file)) {
						file.status = plupload.UPLOADING;
						this.trigger("UploadFile", file);
					}
				} else {
					count++;
				}
			}

			// All files are DONE or FAILED
			if (count == files.length) {
				if (this.state !== plupload.STOPPED) {
					this.state = plupload.STOPPED;
					this.trigger("StateChanged");
				}
				this.trigger("UploadComplete", files);
			}
		}
	}


	function calcFile(file) {
		file.percent = file.size > 0 ? Math.ceil(file.loaded / file.size * 100) : 100;
		calc();
	}


	function calc() {
		var i, file;

		// Reset stats
		total.reset();

		// Check status, size, loaded etc on all files
		for (i = 0; i < files.length; i++) {
			file = files[i];

			if (file.size !== undef) {
				// We calculate totals based on original file size
				total.size += file.origSize;

				// Since we cannot predict file size after resize, we do opposite and
				// interpolate loaded amount to match magnitude of total
				total.loaded += file.loaded * file.origSize / file.size;
			} else {
				total.size = undef;
			}

			if (file.status == plupload.DONE) {
				total.uploaded++;
			} else if (file.status == plupload.FAILED) {
				total.failed++;
			} else {
				total.queued++;
			}
		}

		// If we couldn't calculate a total file size then use the number of files to calc percent
		if (total.size === undef) {
			total.percent = files.length > 0 ? Math.ceil(total.uploaded / files.length * 100) : 0;
		} else {
			total.bytesPerSec = Math.ceil(total.loaded / ((+new Date() - startTime || 1) / 1000.0));
			total.percent = total.size > 0 ? Math.ceil(total.loaded / total.size * 100) : 0;
		}
	}


	function getRUID() {
		var ctrl = fileInputs[0] || fileDrops[0];
		if (ctrl) {
			return ctrl.getRuntime().uid;
		}
		return false;
	}


	function runtimeCan(file, cap) {
		if (file.ruid) {
			var info = o.Runtime.getInfo(file.ruid);
			if (info) {
				return info.can(cap);
			}
		}
		return false;
	}


	function bindEventListeners() {
		this.bind('FilesAdded', onFilesAdded);

		this.bind('CancelUpload', onCancelUpload);
		
		this.bind('BeforeUpload', onBeforeUpload);

		this.bind('UploadFile', onUploadFile);

		this.bind('UploadProgress', onUploadProgress);

		this.bind('StateChanged', onStateChanged);

		this.bind('QueueChanged', calc);

		this.bind('Error', onError);

		this.bind('FileUploaded', onFileUploaded);

		this.bind('Destroy', onDestroy);
	}


	function initControls(settings, cb) {
		var self = this, inited = 0, queue = [];

		// common settings
		var options = {
			accept: settings.filters.mime_types,
			runtime_order: settings.runtimes,
			required_caps: settings.required_features,
			preferred_caps: preferred_caps,
			swf_url: settings.flash_swf_url,
			xap_url: settings.silverlight_xap_url
		};

		// add runtime specific options if any
		plupload.each(settings.runtimes.split(/\s*,\s*/), function(runtime) {
			if (settings[runtime]) {
				options[runtime] = settings[runtime];
			}
		});

		// initialize file pickers - there can be many
		if (settings.browse_button) {
			plupload.each(settings.browse_button, function(el) {
				queue.push(function(cb) {
					var fileInput = new o.FileInput(plupload.extend({}, options, {
						name: settings.file_data_name,
						multiple: settings.multi_selection,
						container: settings.container,
						browse_button: el
					}));

					fileInput.onready = function() {
						var info = o.Runtime.getInfo(this.ruid);

						// for backward compatibility
						o.extend(self.features, {
							chunks: info.can('slice_blob'),
							multipart: info.can('send_multipart'),
							multi_selection: info.can('select_multiple')
						});

						inited++;
						fileInputs.push(this);
						cb();
					};

					fileInput.onchange = function() {
						self.addFile(this.files);
					};

					fileInput.bind('mouseenter mouseleave mousedown mouseup', function(e) {
						if (!disabled) {
							if (settings.browse_button_hover) {
								if ('mouseenter' === e.type) {
									o.addClass(el, settings.browse_button_hover);
								} else if ('mouseleave' === e.type) {
									o.removeClass(el, settings.browse_button_hover);
								}
							}

							if (settings.browse_button_active) {
								if ('mousedown' === e.type) {
									o.addClass(el, settings.browse_button_active);
								} else if ('mouseup' === e.type) {
									o.removeClass(el, settings.browse_button_active);
								}
							}
						}
					});

					fileInput.bind('error runtimeerror', function() {
						fileInput = null;
						cb();
					});

					fileInput.init();
				});
			});
		}

		// initialize drop zones
		if (settings.drop_element) {
			plupload.each(settings.drop_element, function(el) {
				queue.push(function(cb) {
					var fileDrop = new o.FileDrop(plupload.extend({}, options, {
						drop_zone: el
					}));

					fileDrop.onready = function() {
						var info = o.Runtime.getInfo(this.ruid);

						self.features.dragdrop = info.can('drag_and_drop'); // for backward compatibility

						inited++;
						fileDrops.push(this);
						cb();
					};

					fileDrop.ondrop = function() {
						self.addFile(this.files);
					};

					fileDrop.bind('error runtimeerror', function() {
						fileDrop = null;
						cb();
					});

					fileDrop.init();
				});
			});
		}


		o.inSeries(queue, function() {
			if (typeof(cb) === 'function') {
				cb(inited);
			}
		});
	}


	function resizeImage(blob, params, cb) {
		var img = new o.Image();

		try {
			img.onload = function() {
				img.downsize(params.width, params.height, params.crop, params.preserve_headers);
			};

			img.onresize = function() {
				cb(this.getAsBlob(blob.type, params.quality));
				this.destroy();
			};

			img.onerror = function() {
				cb(blob);
			};

			img.load(blob);
		} catch(ex) {
			cb(blob);
		}
	}


	function setOption(option, value, init) {
		var self = this, reinitRequired = false;

		function _setOption(option, value, init) {
			var oldValue = settings[option];

			switch (option) {
				case 'max_file_size':
					if (option === 'max_file_size') {
						settings.max_file_size = settings.filters.max_file_size = value;
					}
					break;

				case 'chunk_size':
					if (value = plupload.parseSize(value)) {
						settings[option] = value;
					}
					break;

				case 'filters':
					// for sake of backward compatibility
					if (plupload.typeOf(value) === 'array') {
						value = {
							mime_types: value
						};
					}

					if (init) {
						plupload.extend(settings.filters, value);
					} else {
						settings.filters = value;
					}

					// if file format filters are being updated, regenerate the matching expressions
					if (value.mime_types) {
						settings.filters.mime_types.regexp = (function(filters) {
							var extensionsRegExp = [];

							plupload.each(filters, function(filter) {
								plupload.each(filter.extensions.split(/,/), function(ext) {
									if (/^\s*\*\s*$/.test(ext)) {
										extensionsRegExp.push('\\.*');
									} else {
										extensionsRegExp.push('\\.' + ext.replace(new RegExp('[' + ('/^$.*+?|()[]{}\\'.replace(/./g, '\\$&')) + ']', 'g'), '\\$&'));
									}
								});
							});

							return new RegExp('(' + extensionsRegExp.join('|') + ')$', 'i');
						}(settings.filters.mime_types));
					}
					break;
	
				case 'resize':
					if (init) {
						plupload.extend(settings.resize, value, {
							enabled: true
						});
					} else {
						settings.resize = value;
					}
					break;

				case 'prevent_duplicates':
					settings.prevent_duplicates = settings.filters.prevent_duplicates = !!value;
					break;

				case 'browse_button':
				case 'drop_element':
						value = plupload.get(value);

				case 'container':
				case 'runtimes':
				case 'multi_selection':
				case 'flash_swf_url':
				case 'silverlight_xap_url':
					settings[option] = value;
					if (!init) {
						reinitRequired = true;
					}
					break;

				default:
					settings[option] = value;
			}

			if (!init) {
				self.trigger('OptionChanged', option, value, oldValue);
			}
		}

		if (typeof(option) === 'object') {
			plupload.each(option, function(value, option) {
				_setOption(option, value, init);
			});
		} else {
			_setOption(option, value, init);
		}

		if (init) {
			// Normalize the list of required capabilities
			settings.required_features = normalizeCaps(plupload.extend({}, settings));

			// Come up with the list of capabilities that can affect default mode in a multi-mode runtimes
			preferred_caps = normalizeCaps(plupload.extend({}, settings, {
				required_features: true
			}));
		} else if (reinitRequired) {
			self.trigger('Destroy');
			
			initControls.call(self, settings, function(inited) {
				if (inited) {
					self.runtime = o.Runtime.getInfo(getRUID()).type;
					self.trigger('Init', { runtime: self.runtime });
					self.trigger('PostInit');
				} else {
					self.trigger('Error', {
						code : plupload.INIT_ERROR,
						message : plupload.translate('Init error.')
					});
				}
			});
		}
	}


	// Internal event handlers
	function onFilesAdded(up, filteredFiles) {
		// Add files to queue				
		[].push.apply(files, filteredFiles);

		up.trigger('QueueChanged');
		up.refresh();
	}


	function onBeforeUpload(up, file) {
		// Generate unique target filenames
		if (settings.unique_names) {
			var matches = file.name.match(/\.([^.]+)$/), ext = "part";
			if (matches) {
				ext = matches[1];
			}
			file.target_name = file.id + '.' + ext;
		}
	}


	function onUploadFile(up, file) {
		var url = up.settings.url
		, chunkSize = up.settings.chunk_size
		, retries = up.settings.max_retries
		, features = up.features
		, offset = 0
		, blob
		;

		// make sure we start at a predictable offset
		if (file.loaded) {
			offset = file.loaded = chunkSize * Math.floor(file.loaded / chunkSize);
		}

		function handleError() {
			if (retries-- > 0) {
				delay(uploadNextChunk, 1000);
			} else {
				file.loaded = offset; // reset all progress

				up.trigger('Error', {
					code : plupload.HTTP_ERROR,
					message : plupload.translate('HTTP Error.'),
					file : file,
					response : xhr.responseText,
					status : xhr.status,
					responseHeaders: xhr.getAllResponseHeaders()
				});
			}
		}

		function uploadNextChunk() {
			var chunkBlob, formData, args, curChunkSize;

			// File upload finished
			if (file.status == plupload.DONE || file.status == plupload.FAILED || up.state == plupload.STOPPED) {
				return;
			}

			// Standard arguments
			args = {name : file.target_name || file.name};

			if (chunkSize && features.chunks && blob.size > chunkSize) { // blob will be of type string if it was loaded in memory 
				curChunkSize = Math.min(chunkSize, blob.size - offset);
				chunkBlob = blob.slice(offset, offset + curChunkSize);
			} else {
				curChunkSize = blob.size;
				chunkBlob = blob;
			}

			// If chunking is enabled add corresponding args, no matter if file is bigger than chunk or smaller
			if (chunkSize && features.chunks) {
				// Setup query string arguments
				if (up.settings.send_chunk_number) {
					args.chunk = Math.ceil(offset / chunkSize);
					args.chunks = Math.ceil(blob.size / chunkSize);
				} else { // keep support for experimental chunk format, just in case
					args.offset = offset;
					args.total = blob.size;
				}
			}

			xhr = new o.XMLHttpRequest();

			// Do we have upload progress support
			if (xhr.upload) {
				xhr.upload.onprogress = function(e) {
					file.loaded = Math.min(file.size, offset + e.loaded);
					up.trigger('UploadProgress', file);
				};
			}

			xhr.onload = function() {
				// check if upload made itself through
				if (xhr.status >= 400) {
					handleError();
					return;
				}

				retries = up.settings.max_retries; // reset the counter

				// Handle chunk response
				if (curChunkSize < blob.size) {
					chunkBlob.destroy();

					offset += curChunkSize;
					file.loaded = Math.min(offset, blob.size);

					up.trigger('ChunkUploaded', file, {
						offset : file.loaded,
						total : blob.size,
						response : xhr.responseText,
						status : xhr.status,
						responseHeaders: xhr.getAllResponseHeaders()
					});

					// stock Android browser doesn't fire upload progress events, but in chunking mode we can fake them
					if (o.Env.browser === 'Android Browser') {
						// doesn't harm in general, but is not required anywhere else
						up.trigger('UploadProgress', file);
					} 
				} else {
					file.loaded = file.size;
				}

				chunkBlob = formData = null; // Free memory

				// Check if file is uploaded
				if (!offset || offset >= blob.size) {
					// If file was modified, destory the copy
					if (file.size != file.origSize) {
						blob.destroy();
						blob = null;
					}

					up.trigger('UploadProgress', file);

					file.status = plupload.DONE;

					up.trigger('FileUploaded', file, {
						response : xhr.responseText,
						status : xhr.status,
						responseHeaders: xhr.getAllResponseHeaders()
					});
				} else {
					// Still chunks left
					delay(uploadNextChunk, 1); // run detached, otherwise event handlers interfere
				}
			};

			xhr.onerror = function() {
				handleError();
			};

			xhr.onloadend = function() {
				this.destroy();
				xhr = null;
			};

			// Build multipart request
			if (up.settings.multipart && features.multipart) {

				args.name = file.target_name || file.name;

				xhr.open("post", url, true);

				// Set custom headers
				plupload.each(up.settings.headers, function(value, name) {
					xhr.setRequestHeader(name, value);
				});

				formData = new o.FormData();

				// Add multipart params
				plupload.each(plupload.extend(args, up.settings.multipart_params), function(value, name) {
					formData.append(name, value);
				});

				// Add file and send it
				formData.append(up.settings.file_data_name, chunkBlob);
				xhr.send(formData, {
					runtime_order: up.settings.runtimes,
					required_caps: up.settings.required_features,
					preferred_caps: preferred_caps,
					swf_url: up.settings.flash_swf_url,
					xap_url: up.settings.silverlight_xap_url
				});
			} else {
				// if no multipart, send as binary stream
				url = plupload.buildUrl(up.settings.url, plupload.extend(args, up.settings.multipart_params));

				xhr.open("post", url, true);

				xhr.setRequestHeader('Content-Type', 'application/octet-stream'); // Binary stream header

				// Set custom headers
				plupload.each(up.settings.headers, function(value, name) {
					xhr.setRequestHeader(name, value);
				});

				xhr.send(chunkBlob, {
					runtime_order: up.settings.runtimes,
					required_caps: up.settings.required_features,
					preferred_caps: preferred_caps,
					swf_url: up.settings.flash_swf_url,
					xap_url: up.settings.silverlight_xap_url
				});
			}
		}

		blob = file.getSource();

		// Start uploading chunks
		if (up.settings.resize.enabled && runtimeCan(blob, 'send_binary_string') && !!~o.inArray(blob.type, ['image/jpeg', 'image/png'])) {
			// Resize if required
			resizeImage.call(this, blob, up.settings.resize, function(resizedBlob) {
				blob = resizedBlob;
				file.size = resizedBlob.size;
				uploadNextChunk();
			});
		} else {
			uploadNextChunk();
		}
	}


	function onUploadProgress(up, file) {
		calcFile(file);
	}


	function onStateChanged(up) {
		if (up.state == plupload.STARTED) {
			// Get start time to calculate bps
			startTime = (+new Date());
		} else if (up.state == plupload.STOPPED) {
			// Reset currently uploading files
			for (var i = up.files.length - 1; i >= 0; i--) {
				if (up.files[i].status == plupload.UPLOADING) {
					up.files[i].status = plupload.QUEUED;
					calc();
				}
			}
		}
	}


	function onCancelUpload() {
		if (xhr) {
			xhr.abort();
		}
	}


	function onFileUploaded(up) {
		calc();

		// Upload next file but detach it from the error event
		// since other custom listeners might want to stop the queue
		delay(function() {
			uploadNext.call(up);
		}, 1);
	}


	function onError(up, err) {
		// Set failed status if an error occured on a file
		if (err.file) {
			err.file.status = plupload.FAILED;
			calcFile(err.file);

			// Upload next file but detach it from the error event
			// since other custom listeners might want to stop the queue
			if (up.state == plupload.STARTED) { // upload in progress
				up.trigger('CancelUpload');
				delay(function() {
					uploadNext.call(up);
				}, 1);
			}
		}
	}


	function onDestroy(up) {
		up.stop();

		// Purge the queue
		plupload.each(files, function(file) {
			file.destroy();
		});
		files = [];

		if (fileInputs.length) {
			plupload.each(fileInputs, function(fileInput) {
				fileInput.destroy();
			});
			fileInputs = [];
		}

		if (fileDrops.length) {
			plupload.each(fileDrops, function(fileDrop) {
				fileDrop.destroy();
			});
			fileDrops = [];
		}

		preferred_caps = {};
		disabled = false;
		startTime = xhr = null;
		total.reset();
	}


	// Default settings
	settings = {
		runtimes: o.Runtime.order,
		max_retries: 0,
		chunk_size: 0,
		multipart: true,
		multi_selection: true,
		file_data_name: 'file',
		flash_swf_url: 'js/Moxie.swf',
		silverlight_xap_url: 'js/Moxie.xap',
		filters: {
			mime_types: [],
			prevent_duplicates: false,
			max_file_size: 0
		},
		resize: {
			enabled: false,
			preserve_headers: true,
			crop: false
		},
		send_chunk_number: true // whether to send chunks and chunk numbers, or total and offset bytes
	};

	
	setOption.call(this, options, null, true);

	// Inital total state
	total = new plupload.QueueProgress(); 

	// Add public methods
	plupload.extend(this, {

		/**
		 * Unique id for the Uploader instance.
		 *
		 * @property id
		 * @type String
		 */
		id : uid,
		uid : uid, // mOxie uses this to differentiate between event targets

		/**
		 * Current state of the total uploading progress. This one can either be plupload.STARTED or plupload.STOPPED.
		 * These states are controlled by the stop/start methods. The default value is STOPPED.
		 *
		 * @property state
		 * @type Number
		 */
		state : plupload.STOPPED,

		/**
		 * Map of features that are available for the uploader runtime. Features will be filled
		 * before the init event is called, these features can then be used to alter the UI for the end user.
		 * Some of the current features that might be in this map is: dragdrop, chunks, jpgresize, pngresize.
		 *
		 * @property features
		 * @type Object
		 */
		features : {},

		/**
		 * Current runtime name.
		 *
		 * @property runtime
		 * @type String
		 */
		runtime : null,

		/**
		 * Current upload queue, an array of File instances.
		 *
		 * @property files
		 * @type Array
		 * @see plupload.File
		 */
		files : files,

		/**
		 * Object with name/value settings.
		 *
		 * @property settings
		 * @type Object
		 */
		settings : settings,

		/**
		 * Total progess information. How many files has been uploaded, total percent etc.
		 *
		 * @property total
		 * @type plupload.QueueProgress
		 */
		total : total,


		/**
		 * Initializes the Uploader instance and adds internal event listeners.
		 *
		 * @method init
		 */
		init : function() {
			var self = this;

			if (typeof(settings.preinit) == "function") {
				settings.preinit(self);
			} else {
				plupload.each(settings.preinit, function(func, name) {
					self.bind(name, func);
				});
			}

			// Check for required options
			if (!settings.browse_button || !settings.url) {
				this.trigger('Error', {
					code : plupload.INIT_ERROR,
					message : plupload.translate('Init error.')
				});
				return;
			}

			bindEventListeners.call(this);

			initControls.call(this, settings, function(inited) {
				if (typeof(settings.init) == "function") {
					settings.init(self);
				} else {
					plupload.each(settings.init, function(func, name) {
						self.bind(name, func);
					});
				}

				if (inited) {
					self.runtime = o.Runtime.getInfo(getRUID()).type;
					self.trigger('Init', { runtime: self.runtime });
					self.trigger('PostInit');
				} else {
					self.trigger('Error', {
						code : plupload.INIT_ERROR,
						message : plupload.translate('Init error.')
					});
				}
			});
		},

		/**
		 * Set the value for the specified option(s).
		 *
		 * @method setOption
		 * @since 2.1
		 * @param {String|Object} option Name of the option to change or the set of key/value pairs
		 * @param {Mixed} [value] Value for the option (is ignored, if first argument is object)
		 */
		setOption: function(option, value) {
			setOption.call(this, option, value, !this.runtime); // until runtime not set we do not need to reinitialize
		},

		/**
		 * Get the value for the specified option or the whole configuration, if not specified.
		 * 
		 * @method getOption
		 * @since 2.1
		 * @param {String} [option] Name of the option to get
		 * @return {Mixed} Value for the option or the whole set
		 */
		getOption: function(option) {
			if (!option) {
				return settings;
			}
			return settings[option];
		},

		/**
		 * Refreshes the upload instance by dispatching out a refresh event to all runtimes.
		 * This would for example reposition flash/silverlight shims on the page.
		 *
		 * @method refresh
		 */
		refresh : function() {
			if (fileInputs.length) {
				plupload.each(fileInputs, function(fileInput) {
					fileInput.trigger('Refresh');
				});
			}
			this.trigger('Refresh');
		},

		/**
		 * Starts uploading the queued files.
		 *
		 * @method start
		 */
		start : function() {
			if (this.state != plupload.STARTED) {
				this.state = plupload.STARTED;
				this.trigger('StateChanged');

				uploadNext.call(this);
			}
		},

		/**
		 * Stops the upload of the queued files.
		 *
		 * @method stop
		 */
		stop : function() {
			if (this.state != plupload.STOPPED) {
				this.state = plupload.STOPPED;
				this.trigger('StateChanged');
				this.trigger('CancelUpload');
			}
		},


		/**
		 * Disables/enables browse button on request.
		 *
		 * @method disableBrowse
		 * @param {Boolean} disable Whether to disable or enable (default: true)
		 */
		disableBrowse : function() {
			disabled = arguments[0] !== undef ? arguments[0] : true;

			if (fileInputs.length) {
				plupload.each(fileInputs, function(fileInput) {
					fileInput.disable(disabled);
				});
			}

			this.trigger('DisableBrowse', disabled);
		},

		/**
		 * Returns the specified file object by id.
		 *
		 * @method getFile
		 * @param {String} id File id to look for.
		 * @return {plupload.File} File object or undefined if it wasn't found;
		 */
		getFile : function(id) {
			var i;
			for (i = files.length - 1; i >= 0; i--) {
				if (files[i].id === id) {
					return files[i];
				}
			}
		},

		/**
		 * Adds file to the queue programmatically. Can be native file, instance of Plupload.File,
		 * instance of mOxie.File, input[type="file"] element, or array of these. Fires FilesAdded, 
		 * if any files were added to the queue. Otherwise nothing happens.
		 *
		 * @method addFile
		 * @since 2.0
		 * @param {plupload.File|mOxie.File|File|Node|Array} file File or files to add to the queue.
		 * @param {String} [fileName] If specified, will be used as a name for the file
		 */
		addFile : function(file, fileName) {
			var self = this
			, queue = [] 
			, files = []
			, ruid
			;

			function filterFile(file, cb) {
				var queue = [];
				o.each(self.settings.filters, function(rule, name) {
					if (fileFilters[name]) {
						queue.push(function(cb) {
							fileFilters[name].call(self, rule, file, function(res) {
								cb(!res);
							});
						});
					}
				});
				o.inSeries(queue, cb);
			}

			/**
			 * @method resolveFile
			 * @private
			 * @param {o.File|o.Blob|plupload.File|File|Blob|input[type="file"]} file
			 */
			function resolveFile(file) {
				var type = o.typeOf(file);

				// o.File
				if (file instanceof o.File) { 
					if (!file.ruid && !file.isDetached()) {
						if (!ruid) { // weird case
							return false;
						}
						file.ruid = ruid;
						file.connectRuntime(ruid);
					}
					resolveFile(new plupload.File(file));
				}
				// o.Blob 
				else if (file instanceof o.Blob) {
					resolveFile(file.getSource());
					file.destroy();
				} 
				// plupload.File - final step for other branches
				else if (file instanceof plupload.File) {
					if (fileName) {
						file.name = fileName;
					}
					
					queue.push(function(cb) {
						// run through the internal and user-defined filters, if any
						filterFile(file, function(err) {
							if (!err) {
								files.push(file);
								self.trigger("FileFiltered", file);
							}
							delay(cb, 1); // do not build up recursions or eventually we might hit the limits
						});
					});
				} 
				// native File or blob
				else if (o.inArray(type, ['file', 'blob']) !== -1) {
					resolveFile(new o.File(null, file));
				} 
				// input[type="file"]
				else if (type === 'node' && o.typeOf(file.files) === 'filelist') {
					// if we are dealing with input[type="file"]
					o.each(file.files, resolveFile);
				} 
				// mixed array of any supported types (see above)
				else if (type === 'array') {
					fileName = null; // should never happen, but unset anyway to avoid funny situations
					o.each(file, resolveFile);
				}
			}

			ruid = getRUID();
			
			resolveFile(file);

			if (queue.length) {
				o.inSeries(queue, function() {
					// if any files left after filtration, trigger FilesAdded
					if (files.length) {
						self.trigger("FilesAdded", files);
					}
				});
			}
		},

		/**
		 * Removes a specific file.
		 *
		 * @method removeFile
		 * @param {plupload.File|String} file File to remove from queue.
		 */
		removeFile : function(file) {
			var id = typeof(file) === 'string' ? file : file.id;

			for (var i = files.length - 1; i >= 0; i--) {
				if (files[i].id === id) {
					return this.splice(i, 1)[0];
				}
			}
		},

		/**
		 * Removes part of the queue and returns the files removed. This will also trigger the FilesRemoved and QueueChanged events.
		 *
		 * @method splice
		 * @param {Number} start (Optional) Start index to remove from.
		 * @param {Number} length (Optional) Lengh of items to remove.
		 * @return {Array} Array of files that was removed.
		 */
		splice : function(start, length) {
			// Splice and trigger events
			var removed = files.splice(start === undef ? 0 : start, length === undef ? files.length : length);

			// if upload is in progress we need to stop it and restart after files are removed
			var restartRequired = false;
			if (this.state == plupload.STARTED) { // upload in progress
				restartRequired = true;
				this.stop();
			}

			this.trigger("FilesRemoved", removed);

			// Dispose any resources allocated by those files
			plupload.each(removed, function(file) {
				file.destroy();
			});

			this.trigger("QueueChanged");
			this.refresh();

			if (restartRequired) {
				this.start();
			}

			return removed;
		},

		/**
		 * Dispatches the specified event name and it's arguments to all listeners.
		 *
		 *
		 * @method trigger
		 * @param {String} name Event name to fire.
		 * @param {Object..} Multiple arguments to pass along to the listener functions.
		 */

		/**
		 * Check whether uploader has any listeners to the specified event.
		 *
		 * @method hasEventListener
		 * @param {String} name Event name to check for.
		 */


		/**
		 * Adds an event listener by name.
		 *
		 * @method bind
		 * @param {String} name Event name to listen for.
		 * @param {function} func Function to call ones the event gets fired.
		 * @param {Object} scope Optional scope to execute the specified function in.
		 */
		bind : function(name, func, scope) {
			var self = this;
			// adapt moxie EventTarget style to Plupload-like
			plupload.Uploader.prototype.bind.call(this, name, function() {
				var args = [].slice.call(arguments);
				args.splice(0, 1, self); // replace event object with uploader instance
				return func.apply(this, args);
			}, 0, scope);
		},

		/**
		 * Removes the specified event listener.
		 *
		 * @method unbind
		 * @param {String} name Name of event to remove.
		 * @param {function} func Function to remove from listener.
		 */

		/**
		 * Removes all event listeners.
		 *
		 * @method unbindAll
		 */


		/**
		 * Destroys Plupload instance and cleans after itself.
		 *
		 * @method destroy
		 */
		destroy : function() {
			this.trigger('Destroy');
			settings = total = null; // purge these exclusively
			this.unbindAll();
		}
	});
};

plupload.Uploader.prototype = o.EventTarget.instance;

/**
 * Constructs a new file instance.
 *
 * @class File
 * @constructor
 * 
 * @param {Object} file Object containing file properties
 * @param {String} file.name Name of the file.
 * @param {Number} file.size File size.
 */
plupload.File = (function() {
	var filepool = {};

	function PluploadFile(file) {

		plupload.extend(this, {

			/**
			 * File id this is a globally unique id for the specific file.
			 *
			 * @property id
			 * @type String
			 */
			id: plupload.guid(),

			/**
			 * File name for example "myfile.gif".
			 *
			 * @property name
			 * @type String
			 */
			name: file.name || file.fileName,

			/**
			 * File type, `e.g image/jpeg`
			 *
			 * @property type
			 * @type String
			 */
			type: file.type || '',

			/**
			 * File size in bytes (may change after client-side manupilation).
			 *
			 * @property size
			 * @type Number
			 */
			size: file.size || file.fileSize,

			/**
			 * Original file size in bytes.
			 *
			 * @property origSize
			 * @type Number
			 */
			origSize: file.size || file.fileSize,

			/**
			 * Number of bytes uploaded of the files total size.
			 *
			 * @property loaded
			 * @type Number
			 */
			loaded: 0,

			/**
			 * Number of percentage uploaded of the file.
			 *
			 * @property percent
			 * @type Number
			 */
			percent: 0,

			/**
			 * Status constant matching the plupload states QUEUED, UPLOADING, FAILED, DONE.
			 *
			 * @property status
			 * @type Number
			 * @see plupload
			 */
			status: plupload.QUEUED,

			/**
			 * Date of last modification.
			 *
			 * @property lastModifiedDate
			 * @type {String}
			 */
			lastModifiedDate: file.lastModifiedDate || (new Date()).toLocaleString(), // Thu Aug 23 2012 19:40:00 GMT+0400 (GET)

			/**
			 * Returns native window.File object, when it's available.
			 *
			 * @method getNative
			 * @return {window.File} or null, if plupload.File is of different origin
			 */
			getNative: function() {
				var file = this.getSource().getSource();
				return o.inArray(o.typeOf(file), ['blob', 'file']) !== -1 ? file : null;
			},

			/**
			 * Returns mOxie.File - unified wrapper object that can be used across runtimes.
			 *
			 * @method getSource
			 * @return {mOxie.File} or null
			 */
			getSource: function() {
				if (!filepool[this.id]) {
					return null;
				}
				return filepool[this.id];
			},

			/**
			 * Destroys plupload.File object.
			 *
			 * @method destroy
			 */
			destroy: function() {
				var src = this.getSource();
				if (src) {
					src.destroy();
					delete filepool[this.id];
				}
			}
		});

		filepool[this.id] = file;
	}

	return PluploadFile;
}());


/**
 * Constructs a queue progress.
 *
 * @class QueueProgress
 * @constructor
 */
 plupload.QueueProgress = function() {
	var self = this; // Setup alias for self to reduce code size when it's compressed

	/**
	 * Total queue file size.
	 *
	 * @property size
	 * @type Number
	 */
	self.size = 0;

	/**
	 * Total bytes uploaded.
	 *
	 * @property loaded
	 * @type Number
	 */
	self.loaded = 0;

	/**
	 * Number of files uploaded.
	 *
	 * @property uploaded
	 * @type Number
	 */
	self.uploaded = 0;

	/**
	 * Number of files failed to upload.
	 *
	 * @property failed
	 * @type Number
	 */
	self.failed = 0;

	/**
	 * Number of files yet to be uploaded.
	 *
	 * @property queued
	 * @type Number
	 */
	self.queued = 0;

	/**
	 * Total percent of the uploaded bytes.
	 *
	 * @property percent
	 * @type Number
	 */
	self.percent = 0;

	/**
	 * Bytes uploaded per second.
	 *
	 * @property bytesPerSec
	 * @type Number
	 */
	self.bytesPerSec = 0;

	/**
	 * Resets the progress to it's initial values.
	 *
	 * @method reset
	 */
	self.reset = function() {
		self.size = self.loaded = self.uploaded = self.failed = self.queued = self.percent = self.bytesPerSec = 0;
	};
};

window.plupload = plupload;

}(window, mOxie));
// Chinese (China) (zh_CN)
plupload.addI18n({"Stop Upload":"停止上传","Upload URL might be wrong or doesn't exist.":"上传的URL可能是错误的或不存在。","tb":"tb","Size":"大小","Close":"关闭","Init error.":"初始化错误。","Add files to the upload queue and click the start button.":"将文件添加到上传队列，然后点击”开始上传“按钮。","Filename":"文件名","Image format either wrong or not supported.":"图片格式错误或者不支持。","Status":"状态","HTTP Error.":"HTTP 错误。","Start Upload":"开始上传","mb":"mb","kb":"kb","Duplicate file error.":"重复文件错误。","File size error.":"文件大小错误。","N/A":"N/A","gb":"gb","Error: Invalid file extension:":"错误：无效的文件扩展名:","Select files":"选择文件","%s already present in the queue.":"%s 已经在当前队列里。","File: %s":"文件: %s","b":"b","Uploaded %d/%d files":"已上传 %d/%d 个文件","Upload element accepts only %d file(s) at a time. Extra files were stripped.":"每次只接受同时上传 %d 个文件，多余的文件将会被删除。","%d files queued":"%d 个文件加入到队列","File: %s, size: %d, max file size: %d":"文件: %s, 大小: %d, 最大文件大小: %d","Drag files here.":"把文件拖到这里。","Runtime ran out of available memory.":"运行时已消耗所有可用内存。","File count error.":"文件数量错误。","File extension error.":"文件扩展名错误。","Error: File too large:":"错误: 文件太大:","Add Files":"增加文件"});/*!
 * qiniu-js-sdk v@VERSION
 *
 * Copyright 2015 by Qiniu
 * Released under GPL V2 License.
 *
 * GitHub: http://github.com/qiniu/js-sdk
 *
 * Date: @DATE
*/

/*global plupload ,mOxie*/
/*global ActiveXObject */
/*exported Qiniu */
/*exported QiniuJsSDK */

;(function( global ){

/**
 * Creates new cookie or removes cookie with negative expiration
 * @param  key       The key or identifier for the store
 * @param  value     Contents of the store
 * @param  exp       Expiration - creation defaults to 30 days
 */
function createCookie(key, value, exp) {
    var date = new Date();
    date.setTime(date.getTime() + (exp * 24 * 60 * 60 * 1000));
    var expires = "; expires=" + date.toGMTString();
    document.cookie = key + "=" + value + expires + "; path=/";
}

/**
 * Returns contents of cookie
 * @param  key       The key or identifier for the store
 */
function readCookie(key) {
    var nameEQ = key + "=";
    var ca = document.cookie.split(';');
    for (var i = 0, max = ca.length; i < max; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) === 0) {
            return c.substring(nameEQ.length, c.length);
        }
    }
    return null;
}

// if current browser is not support localStorage
// use cookie to make a polyfill
if ( !window.localStorage ) {
    window.localStorage = {
        setItem: function (key, value) {
            createCookie(key, value, 30);
        },
        getItem: function (key) {
            return readCookie(key);
        },
        removeItem: function (key) {
            createCookie(key, '', -1);
        }
    };
}

function QiniuJsSDK() {

    var that = this;

    /**
     * detect IE version
     * if current browser is not IE
     *     it will return false
     * else
     *     it will return version of current IE browser
     * @return {Number|Boolean} IE version or false
     */
    this.detectIEVersion = function() {
        var v = 4,
            div = document.createElement('div'),
            all = div.getElementsByTagName('i');
        while (
            div.innerHTML = '<!--[if gt IE ' + v + ']><i></i><![endif]-->',
            all[0]
        ) {
            v++;
        }
        return v > 4 ? v : false;
    };

    var logger = {
        MUTE: 0,
        FATA: 1,
        ERROR: 2,
        WARN: 3,
        INFO: 4,
        DEBUG: 5,
        TRACE: 6,
        level: 0
    };

    function log(type, args){
        var header = "[qiniu-js-sdk]["+type+"]";
        var msg = header;
        for (var i = 0; i < args.length; i++) {
            if (typeof args[i] === "string") {
                msg += " " + args[i];
            } else {
                msg += " " + that.stringifyJSON(args[i]);
            }
        }
        if (that.detectIEVersion()) {
            // http://stackoverflow.com/questions/5538972/console-log-apply-not-working-in-ie9
            //var log = Function.prototype.bind.call(console.log, console);
            //log.apply(console, args);
            console.log(msg);
        }else{
            args.unshift(header);
            console.log.apply(console, args);
        }
        if (document.getElementById('qiniu-js-sdk-log')) {
            document.getElementById('qiniu-js-sdk-log').innerHTML += '<p>'+msg+'</p>';
        }
    }

    function makeLogFunc(code){
        var func = code.toLowerCase();
        logger[func] = function(){
            // logger[func].history = logger[func].history || [];
            // logger[func].history.push(arguments);
            if(window.console && window.console.log && logger.level>=logger[code]){
                var args = Array.prototype.slice.call(arguments);
                log(func,args);
            }
        };
    }

    for (var property in logger){
        if (logger.hasOwnProperty(property) && (typeof logger[property]) === "number" && !logger.hasOwnProperty(property.toLowerCase())) {
            makeLogFunc(property);
        }
    }


    var qiniuUploadUrl;
    if (window.location.protocol === 'https:') {
        qiniuUploadUrl = 'https://up.qbox.me';
    } else {
        qiniuUploadUrl = 'http://upload.qiniu.com';
    }

    /**
     * qiniu upload urls
     * 'qiniuUploadUrls' is used to change target when current url is not avaliable
     * @type {Array}
     */
    var qiniuUploadUrls = [
        "http://upload.qiniu.com",
        "http://up.qiniu.com"
    ];

    var qiniuUpHosts = {
       "http": [
           "http://upload.qiniu.com",
           "http://up.qiniu.com"
       ],
       "https": [
           "https://up.qbox.me"
       ]
    };

    var changeUrlTimes = 0;

    /**
     * reset upload url
     * if current page protocal is https
     *     it will always return 'https://up.qbox.me'
     * else
     *     it will set 'qiniuUploadUrl' value with 'qiniuUploadUrls' looply
     */
    this.resetUploadUrl = function(){
	var hosts = window.location.protocol === 'https:' ? qiniuUpHosts.https : qiniuUpHosts.http;
	var i = changeUrlTimes % (hosts.length-1);
	qiniuUploadUrl = hosts[i];
	changeUrlTimes++;
	logger.debug('resetUploadUrl: '+qiniuUploadUrl);
    };

    // this.resetUploadUrl();


    /**
     * is image
     * @param  {String}  url of a file
     * @return {Boolean} file is a image or not
     */
    this.isImage = function(url) {
        url = url.split(/[?#]/)[0];
        return (/\.(png|jpg|jpeg|gif|bmp)$/i).test(url);
    };

    /**
     * get file extension
     * @param  {String} filename
     * @return {String} file extension
     * @example
     *     input: test.txt
     *     output: txt
     */
    this.getFileExtension = function(filename) {
        var tempArr = filename.split(".");
        var ext;
        if (tempArr.length === 1 || (tempArr[0] === "" && tempArr.length === 2)) {
            ext = "";
        } else {
            ext = tempArr.pop().toLowerCase(); //get the extension and make it lower-case
        }
        return ext;
    };

    /**
     * encode string by utf8
     * @param  {String} string to encode
     * @return {String} encoded string
     */
    this.utf8_encode = function(argString) {
        // http://kevin.vanzonneveld.net
        // +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // +   improved by: sowberry
        // +    tweaked by: Jack
        // +   bugfixed by: Onno Marsman
        // +   improved by: Yves Sucaet
        // +   bugfixed by: Onno Marsman
        // +   bugfixed by: Ulrich
        // +   bugfixed by: Rafal Kukawski
        // +   improved by: kirilloid
        // +   bugfixed by: kirilloid
        // *     example 1: this.utf8_encode('Kevin van Zonneveld');
        // *     returns 1: 'Kevin van Zonneveld'

        if (argString === null || typeof argString === 'undefined') {
            return '';
        }

        var string = (argString + ''); // .replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        var utftext = '',
            start, end, stringl = 0;

        start = end = 0;
        stringl = string.length;
        for (var n = 0; n < stringl; n++) {
            var c1 = string.charCodeAt(n);
            var enc = null;

            if (c1 < 128) {
                end++;
            } else if (c1 > 127 && c1 < 2048) {
                enc = String.fromCharCode(
                    (c1 >> 6) | 192, (c1 & 63) | 128
                );
            } else if (c1 & 0xF800 ^ 0xD800 > 0) {
                enc = String.fromCharCode(
                    (c1 >> 12) | 224, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128
                );
            } else { // surrogate pairs
                if (c1 & 0xFC00 ^ 0xD800 > 0) {
                    throw new RangeError('Unmatched trail surrogate at ' + n);
                }
                var c2 = string.charCodeAt(++n);
                if (c2 & 0xFC00 ^ 0xDC00 > 0) {
                    throw new RangeError('Unmatched lead surrogate at ' + (n - 1));
                }
                c1 = ((c1 & 0x3FF) << 10) + (c2 & 0x3FF) + 0x10000;
                enc = String.fromCharCode(
                    (c1 >> 18) | 240, ((c1 >> 12) & 63) | 128, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128
                );
            }
            if (enc !== null) {
                if (end > start) {
                    utftext += string.slice(start, end);
                }
                utftext += enc;
                start = end = n + 1;
            }
        }

        if (end > start) {
            utftext += string.slice(start, stringl);
        }

        return utftext;
    };

    this.base64_decode = function (data) {
        // http://kevin.vanzonneveld.net
        // +   original by: Tyler Akins (http://rumkin.com)
        // +   improved by: Thunder.m
        // +      input by: Aman Gupta
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // +   bugfixed by: Onno Marsman
        // +   bugfixed by: Pellentesque Malesuada
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // +      input by: Brett Zamir (http://brett-zamir.me)
        // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // *     example 1: base64_decode('S2V2aW4gdmFuIFpvbm5ldmVsZA==');
        // *     returns 1: 'Kevin van Zonneveld'
        // mozilla has this native
        // - but breaks in 2.0.0.12!
        //if (typeof this.window['atob'] == 'function') {
        //    return atob(data);
        //}
        var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
        ac = 0,
        dec = "",
        tmp_arr = [];

        if (!data) {
            return data;
        }

        data += '';

        do { // unpack four hexets into three octets using index points in b64
            h1 = b64.indexOf(data.charAt(i++));
            h2 = b64.indexOf(data.charAt(i++));
            h3 = b64.indexOf(data.charAt(i++));
            h4 = b64.indexOf(data.charAt(i++));

            bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

            o1 = bits >> 16 & 0xff;
            o2 = bits >> 8 & 0xff;
            o3 = bits & 0xff;

            if (h3 === 64) {
                tmp_arr[ac++] = String.fromCharCode(o1);
            } else if (h4 === 64) {
                tmp_arr[ac++] = String.fromCharCode(o1, o2);
            } else {
                tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
            }
        } while (i < data.length);

        dec = tmp_arr.join('');

        return dec;
    };

    /**
     * encode data by base64
     * @param  {String} data to encode
     * @return {String} encoded data
     */
    this.base64_encode = function(data) {
        // http://kevin.vanzonneveld.net
        // +   original by: Tyler Akins (http://rumkin.com)
        // +   improved by: Bayron Guevara
        // +   improved by: Thunder.m
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // +   bugfixed by: Pellentesque Malesuada
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // -    depends on: this.utf8_encode
        // *     example 1: this.base64_encode('Kevin van Zonneveld');
        // *     returns 1: 'S2V2aW4gdmFuIFpvbm5ldmVsZA=='
        // mozilla has this native
        // - but breaks in 2.0.0.12!
        //if (typeof this.window['atob'] == 'function') {
        //    return atob(data);
        //}
        var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
            ac = 0,
            enc = '',
            tmp_arr = [];

        if (!data) {
            return data;
        }

        data = this.utf8_encode(data + '');

        do { // pack three octets into four hexets
            o1 = data.charCodeAt(i++);
            o2 = data.charCodeAt(i++);
            o3 = data.charCodeAt(i++);

            bits = o1 << 16 | o2 << 8 | o3;

            h1 = bits >> 18 & 0x3f;
            h2 = bits >> 12 & 0x3f;
            h3 = bits >> 6 & 0x3f;
            h4 = bits & 0x3f;

            // use hexets to index into b64, and append result to encoded string
            tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
        } while (i < data.length);

        enc = tmp_arr.join('');

        switch (data.length % 3) {
            case 1:
                enc = enc.slice(0, -2) + '==';
                break;
            case 2:
                enc = enc.slice(0, -1) + '=';
                break;
        }

        return enc;
    };

    /**
     * encode string in url by base64
     * @param {String} string in url
     * @return {String} encoded string
     */
    this.URLSafeBase64Encode = function(v) {
        v = this.base64_encode(v);
        return v.replace(/\//g, '_').replace(/\+/g, '-');
    };

    this.URLSafeBase64Decode = function(v) {
        v = v.replace(/_/g, '/').replace(/-/g, '+');
        return this.base64_decode(v);
    };

    // TODO: use mOxie
    /**
     * craete object used to AJAX
     * @return {Object}
     */
    this.createAjax = function(argument) {
        var xmlhttp = {};
        if (window.XMLHttpRequest) {
            xmlhttp = new XMLHttpRequest();
        } else {
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        }
        return xmlhttp;
    };

    // TODO: enhance IE compatibility
    /**
     * parse json string to javascript object
     * @param  {String} json string
     * @return {Object} object
     */
    this.parseJSON = function(data) {
        // Attempt to parse using the native JSON parser first
        if (window.JSON && window.JSON.parse) {
            return window.JSON.parse(data);
        }

        //var rx_one = /^[\],:{}\s]*$/,
        //    rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,
        //    rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,
        //    rx_four = /(?:^|:|,)(?:\s*\[)+/g,
        var    rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

        //var json;

        var text = String(data);
        rx_dangerous.lastIndex = 0;
        if(rx_dangerous.test(text)){
            text = text.replace(rx_dangerous, function(a){
               return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            });
        }

        // todo 使用一下判断,增加安全性
        //if (
        //    rx_one.test(
        //        text
        //            .replace(rx_two, '@')
        //            .replace(rx_three, ']')
        //            .replace(rx_four, '')
        //    )
        //) {
        //    return eval('(' + text + ')');
        //}

        return eval('('+text+')');
    };

    /**
     * parse javascript object to json string
     * @param  {Object} object
     * @return {String} json string
     */
    this.stringifyJSON = function(obj) {
        // Attempt to parse using the native JSON parser first
        if (window.JSON && window.JSON.stringify) {
            return window.JSON.stringify(obj);
        }
        switch (typeof (obj)) {
            case 'string':
                return '"' + obj.replace(/(["\\])/g, '\\$1') + '"';
            case 'array':
                return '[' + obj.map(that.stringifyJSON).join(',') + ']';
            case 'object':
                if (obj instanceof Array) {
                    var strArr = [];
                    var len = obj.length;
                    for (var i = 0; i < len; i++) {
                        strArr.push(that.stringifyJSON(obj[i]));
                    }
                    return '[' + strArr.join(',') + ']';
                } else if (obj === null) {
                    return 'null';
                } else {
                    var string = [];
                    for (var property in obj) {
                        if (obj.hasOwnProperty(property)) {
                            string.push(that.stringifyJSON(property) + ':' + that.stringifyJSON(obj[property]));
                        }
                    }
                    return '{' + string.join(',') + '}';
                }
                break;
            case 'number':
                return obj;
            case false:
                return obj;
            case 'boolean':
                return obj;
        }
    };

    /**
     * trim space beside text
     * @param  {String} untrimed string
     * @return {String} trimed string
     */
    this.trim = function(text) {
        return text === null ? "" : text.replace(/^\s+|\s+$/g, '');
    };

    /**
     * create a uploader by QiniuJsSDK
     * @param  {object} options to create a new uploader
     * @return {object} uploader
     */
    this.uploader = function(op) {

        /********** inner function define start **********/

        // according the different condition to reset chunk size
        // and the upload strategy according with the chunk size
        // when chunk size is zero will cause to direct upload
        // see the statement binded on 'BeforeUpload' event
        var reset_chunk_size = function() {
            var ie = that.detectIEVersion();
            var BLOCK_BITS, MAX_CHUNK_SIZE, chunk_size;
            // case Safari 5、Windows 7、iOS 7 set isSpecialSafari to true
            var isSpecialSafari = (mOxie.Env.browser === "Safari" && mOxie.Env.version <= 5 && mOxie.Env.os === "Windows" && mOxie.Env.osVersion === "7") || (mOxie.Env.browser === "Safari" && mOxie.Env.os === "iOS" && mOxie.Env.osVersion === "7");
            // case IE 9-，chunk_size is not empty and flash is included in runtimes
            // set op.chunk_size to zero
            //if (ie && ie < 9 && op.chunk_size && op.runtimes.indexOf('flash') >= 0) {
            if (ie && ie < 9 && op.chunk_size && op.runtimes.indexOf('flash') >= 0) {
                //  link: http://www.plupload.com/docs/Frequently-Asked-Questions#when-to-use-chunking-and-when-not
                //  when plupload chunk_size setting is't null ,it cause bug in ie8/9  which runs  flash runtimes (not support html5) .
                op.chunk_size = 0;
            } else if (isSpecialSafari) {
                // win7 safari / iOS7 safari have bug when in chunk upload mode
                // reset chunk_size to 0
                // disable chunk in special version safari
                op.chunk_size = 0;
            } else {
                BLOCK_BITS = 20;
                MAX_CHUNK_SIZE = 4 << BLOCK_BITS; //4M

                chunk_size = plupload.parseSize(op.chunk_size);
                if (chunk_size > MAX_CHUNK_SIZE) {
                    op.chunk_size = MAX_CHUNK_SIZE;
                }
                // qiniu service  max_chunk_size is 4m
                // reset chunk_size to max_chunk_size(4m) when chunk_size > 4m
            }
            // if op.chunk_size set 0 will be cause to direct upload
        };

        var getHosts = function(hosts) {
            var result = [];
            for (var i = 0; i < hosts.length; i++) {
                var host = hosts[i];
                if (host.indexOf('-H') === 0) {
                    result.push(host.split(' ')[2]);
                } else {
                    result.push(host);
                }
            }
            return result;
        };

        var getPutPolicy = function (uptoken) {
            var segments = uptoken.split(":");
            var ak = segments[0];
            var putPolicy = that.parseJSON(that.URLSafeBase64Decode(segments[2]));
            putPolicy.ak = ak;
            if (putPolicy.scope.indexOf(":") >= 0) {
                putPolicy.bucket = putPolicy.scope.split(":")[0];
                putPolicy.key = putPolicy.scope.split(":")[1];
            } else {
                putPolicy.bucket = putPolicy.scope;
            }
            return putPolicy;
        };

        var getUpHosts = function(uptoken) {
            var putPolicy = getPutPolicy(uptoken);
            // var uphosts_url = "//uc.qbox.me/v1/query?ak="+ak+"&bucket="+putPolicy.scope;
            // IE 9- is not support protocal relative url
            var uphosts_url = window.location.protocol + "//uc.qbox.me/v1/query?ak=" + putPolicy.ak + "&bucket=" + putPolicy.bucket;
            logger.debug("putPolicy: ", putPolicy);
            logger.debug("get uphosts from: ", uphosts_url);
            var ie = that.detectIEVersion();
            var ajax;
            if (ie && ie <= 9) {
                ajax = new mOxie.XMLHttpRequest();
                mOxie.Env.swf_url = op.flash_swf_url;
            }else{
                ajax = that.createAjax();
            }
            ajax.open('GET', uphosts_url, false);
            var onreadystatechange = function(){
                logger.debug("ajax.readyState: ", ajax.readyState);
                if (ajax.readyState === 4) {
                    logger.debug("ajax.status: ", ajax.status);
                    if (ajax.status < 400) {
                        var res = that.parseJSON(ajax.responseText);
                        qiniuUpHosts.http = getHosts(res.http.up);
                        qiniuUpHosts.https = getHosts(res.https.up);
                        logger.debug("get new uphosts: ", qiniuUpHosts);
                        that.resetUploadUrl();
                    } else {
                        logger.error("get uphosts error: ", ajax.responseText);
                    }
                }
            };
            if (ie && ie <= 9) {
                ajax.bind('readystatechange', onreadystatechange);
            }else{
                ajax.onreadystatechange = onreadystatechange;
            }
            ajax.send();
            // ajax.send();
            // if (ajax.status < 400) {
            //     var res = that.parseJSON(ajax.responseText);
            //     qiniuUpHosts.http = getHosts(res.http.up);
            //     qiniuUpHosts.https = getHosts(res.https.up);
            //     logger.debug("get new uphosts: ", qiniuUpHosts);
            //     that.resetUploadUrl();
            // } else {
            //     logger.error("get uphosts error: ", ajax.responseText);
            // }
            return;
        };

        var getUptoken = function(file) {
            if (!that.token || (op.uptoken_url && that.tokenInfo.isExpired())) {
                return getNewUpToken(file);
            } else {
                return that.token;
            }
        };

        // getNewUptoken maybe called at Init Event or BeforeUpload Event
        // case Init Event, the file param of getUptken will be set a null value
        // if op.uptoken has value, set uptoken with op.uptoken
        // else if op.uptoken_url has value, set uptoken from op.uptoken_url
        // else if op.uptoken_func has value, set uptoken by result of op.uptoken_func
        var getNewUpToken = function(file) {
            if (op.uptoken) {
                that.token = op.uptoken;
            } else if (op.uptoken_url) {
                logger.debug("get uptoken from: ", that.uptoken_url);
                // TODO: use mOxie
                var ajax = that.createAjax();
                ajax.open('GET', that.uptoken_url, false);
                ajax.setRequestHeader("If-Modified-Since", "0");
                // ajax.onreadystatechange = function() {
                //     if (ajax.readyState === 4 && ajax.status === 200) {
                //         var res = that.parseJSON(ajax.responseText);
                //         that.token = res.uptoken;
                //     }
                // };
                ajax.send();
                if (ajax.status === 200) {
                    var res = that.parseJSON(ajax.responseText);
                    that.token = res.data.uptoken || res.data.uploadToken;
                    var segments = that.token.split(":");
                    var putPolicy = that.parseJSON(that.URLSafeBase64Decode(segments[2]));
                    if (!that.tokenMap) {
                        that.tokenMap = {};
                    }
                    var getTimestamp = function(time) {
                        return Math.ceil(time.getTime()/1000);
                    };
                    var serverTime = getTimestamp(new Date(ajax.getResponseHeader("date")));
                    var clientTime = getTimestamp(new Date());
                    that.tokenInfo = {
                        serverDelay: clientTime - serverTime,
                        deadline: putPolicy.deadline,
                        isExpired: function() {
                            var leftTime = this.deadline - getTimestamp(new Date()) + this.serverDelay;
                            return leftTime < 600;
                        }
                    };
                    logger.debug("get new uptoken: ", that.token);
                    logger.debug("get token info: ", that.tokenInfo);
                } else {
                    logger.error("get uptoken error: ", ajax.responseText);
                }
            } else if (op.uptoken_func) {
                logger.debug("get uptoken from uptoken_func");
                that.token = op.uptoken_func(file);
                logger.debug("get new uptoken: ", that.token);
            } else {
                logger.error("one of [uptoken, uptoken_url, uptoken_func] settings in options is required!");
            }
            if (that.token) {
                getUpHosts(that.token);
            }
            return that.token;
        };

        // get file key according with the user passed options
        var getFileKey = function(up, file, func) {
            // WARNING
            // When you set the key in putPolicy by "scope": "bucket:key"
            // You should understand the risk of override a file in the bucket
            // So the code below that automatically get key from uptoken has been commented
            var putPolicy = getPutPolicy(that.token)
            if (putPolicy.key) {
               logger.debug("key is defined in putPolicy.scope: ", putPolicy.key)
                return putPolicy.key
            }
            var key = '',
                unique_names = false;
            if (!op.save_key) {
                unique_names = up.getOption && up.getOption('unique_names');
                unique_names = unique_names || (up.settings && up.settings.unique_names);
                if (unique_names) {
                    var ext = that.getFileExtension(file.name);
                    key = ext ? file.id + '.' + ext : file.id;
                } else if (typeof func === 'function') {
                    key = func(up, file);
                } else {
                    key = file.name;
                }
            }
            return key;
        };

        /********** inner function define end **********/

        if (op.log_level) {
            logger.level = op.log_level;
        }

        if (!op.domain) {
            throw 'domain setting in options is required!';
        }

        if (!op.browse_button) {
            throw 'browse_button setting in options is required!';
        }

        if (!op.uptoken && !op.uptoken_url && !op.uptoken_func) {
            throw 'one of [uptoken, uptoken_url, uptoken_func] settings in options is required!';
        }

        logger.debug("init uploader start");

        logger.debug("environment: ", mOxie.Env);

        logger.debug("userAgent: ", navigator.userAgent);

        var option = {};

        // hold the handler from user passed options
        var _Error_Handler = op.init && op.init.Error;
        var _FileUploaded_Handler = op.init && op.init.FileUploaded;

        // replace the handler for intercept
        op.init.Error = function() {};
        op.init.FileUploaded = function() {};

        that.uptoken_url = op.uptoken_url;
        that.token = '';
        that.key_handler = typeof op.init.Key === 'function' ? op.init.Key : '';
        this.domain = op.domain;
        // TODO: ctx is global in scope of a uploader instance
        // this maybe cause error
        var ctx = '';
        var speedCalInfo = {
            isResumeUpload: false,
            resumeFilesize: 0,
            startTime: '',
            currentTime: ''
        };

        reset_chunk_size();
        logger.debug("invoke reset_chunk_size()");
        logger.debug("op.chunk_size: ", op.chunk_size);

        var defaultSetting = {
            url: qiniuUploadUrl,
            multipart_params: {
                token: ''
            }
        };
        var ie = that.detectIEVersion();
        // case IE 9-
        // add accept in multipart params
        if (ie && ie <= 9) {
            defaultSetting.multipart_params.accept = 'text/plain; charset=utf-8';
            logger.debug("add accept text/plain in multipart params");
        }

        // compose options with user passed options and default setting
        plupload.extend(option, op, defaultSetting);

        logger.debug("option: ", option);

        // create a new uploader with composed options
        var uploader = new plupload.Uploader(option);

        logger.debug("new plupload.Uploader(option)");

        // bind getNewUpToken to 'Init' event
        uploader.bind('Init', function(up, params) {
            logger.debug("Init event activated");
            // if op.get_new_uptoken is not true
            //      invoke getNewUptoken when uploader init
            // else
            //      getNewUptoken everytime before a new file upload
            if(!op.get_new_uptoken){
                getNewUpToken(null);
            }
            //getNewUpToken(null);
        });

        logger.debug("bind Init event");

        // bind 'FilesAdded' event
        // when file be added and auto_start has set value
        // uploader will auto start upload the file
        uploader.bind('FilesAdded', function(up, files) {
            logger.debug("FilesAdded event activated");
            var auto_start = up.getOption && up.getOption('auto_start');
            auto_start = auto_start || (up.settings && up.settings.auto_start);
            logger.debug("auto_start: ", auto_start);
            logger.debug("files: ", files);

            // detect is iOS
            var is_ios = function (){
                if(mOxie.Env.OS.toLowerCase()==="ios") {
                    return true;
                } else {
                    return false;
                }
            };

            // if current env os is iOS change file name to [time].[ext]
            if (is_ios()) {
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    var ext = that.getFileExtension(file.name);
                    file.name = file.id + "." + ext;
                }
            }

            if (auto_start) {
                setTimeout(function(){
                    up.start();
                    logger.debug("invoke up.start()");
                }, 0);
                // up.start();
                // plupload.each(files, function(i, file) {
                //     up.start();
                //     logger.debug("invoke up.start()")
                //     logger.debug("file: ", file);
                // });
            }
            up.refresh(); // Reposition Flash/Silverlight
        });

        logger.debug("bind FilesAdded event");

        // bind 'BeforeUpload' event
        // intercept the process of upload
        // - prepare uptoken
        // - according the chunk size to make differnt upload strategy
        // - resume upload with the last breakpoint of file
        uploader.bind('BeforeUpload', function(up, file) {
            logger.debug("BeforeUpload event activated");
            // add a key named speed for file object

            file.speed = file.speed || 0;
            ctx = '';

            if(op.get_new_uptoken && (!file.percent>0)){
                getNewUpToken(file);
            }

            var directUpload = function(up, file, func) {
                speedCalInfo.startTime = new Date().getTime();
                var multipart_params_obj;
                if (op.save_key) {
                    multipart_params_obj = {
                        'token': that.token
                    };
                } else {
                    multipart_params_obj = {
                        'key': getFileKey(up, file, func),
                        'token': that.token
                    };
                }
                var ie = that.detectIEVersion();
                // case IE 9-
                // add accept in multipart params
                if (ie && ie <= 9) {
                    multipart_params_obj.accept = 'text/plain; charset=utf-8';
                    logger.debug("add accept text/plain in multipart params");
                }

                logger.debug("directUpload multipart_params_obj: ", multipart_params_obj);

                var x_vars = op.x_vars;
                if (x_vars !== undefined && typeof x_vars === 'object') {
                    for (var x_key in x_vars) {
                        if (x_vars.hasOwnProperty(x_key)) {
                            if (typeof x_vars[x_key] === 'function') {
                                multipart_params_obj['x:' + x_key] = x_vars[x_key](up, file);
                            } else if (typeof x_vars[x_key] !== 'object') {
                                multipart_params_obj['x:' + x_key] = x_vars[x_key];
                            }
                        }
                    }
                }

                up.setOption({
                    'url': qiniuUploadUrl,
                    'multipart': true,
                    'chunk_size': is_android_weixin_or_qq() ? op.max_file_size : undefined,
                    'multipart_params': multipart_params_obj
                });
            };

            // detect is weixin or qq inner browser
            var is_android_weixin_or_qq = function (){
                var ua = navigator.userAgent.toLowerCase();
                if((ua.match(/MicroMessenger/i) || mOxie.Env.browser === "QQBrowser" || ua.match(/V1_AND_SQ/i)) && mOxie.Env.OS.toLowerCase()==="android") {
                    return true;
                } else {
                    return false;
                }
            };

            var chunk_size = up.getOption && up.getOption('chunk_size');
            chunk_size = chunk_size || (up.settings && up.settings.chunk_size);

            logger.debug("uploader.runtime: ",uploader.runtime);
            logger.debug("chunk_size: ",chunk_size);

            // TODO: flash support chunk upload
            if ((uploader.runtime === 'html5' || uploader.runtime === 'flash') && chunk_size) {
                if (file.size < chunk_size || is_android_weixin_or_qq()) {
                    logger.debug("directUpload because file.size < chunk_size || is_android_weixin_or_qq()");
                    // direct upload if file size is less then the chunk size
                    directUpload(up, file, that.key_handler);
                } else {
                    // TODO: need a polifill to make it work in IE 9-
                    // ISSUE: if file.name is existed in localStorage
                    // but not the same file maybe cause error
                    var localFileInfo = localStorage.getItem(file.name);
                    var blockSize = chunk_size;
                    if (localFileInfo) {
                        // TODO: although only the html5 runtime will enter this statement
                        // but need uniform way to make convertion between string and json
                        localFileInfo = that.parseJSON(localFileInfo);
                        var now = (new Date()).getTime();
                        var before = localFileInfo.time || 0;
                        var aDay = 24 * 60 * 60 * 1000; //  milliseconds of one day
                        // if the last upload time is within one day
                        //      will upload continuously follow the last breakpoint
                        // else
                        //      will reupload entire file
                        if (now - before < aDay) {

                            if (localFileInfo.percent !== 100) {
                                if (file.size === localFileInfo.total) {
                                    // TODO: if file.name and file.size is the same
                                    // but not the same file will cause error
                                    file.percent = localFileInfo.percent;
                                    file.loaded = localFileInfo.offset;
                                    ctx = localFileInfo.ctx;

                                    // set speed info
                                    speedCalInfo.isResumeUpload = true;
                                    speedCalInfo.resumeFilesize = localFileInfo.offset;

                                    // set block size
                                    if (localFileInfo.offset + blockSize > file.size) {
                                        blockSize = file.size - localFileInfo.offset;
                                    }
                                } else {
                                    // remove file info when file.size is conflict with file info
                                    localStorage.removeItem(file.name);
                                }

                            } else {
                                // remove file info when upload percent is 100%
                                // avoid 499 bug
                                localStorage.removeItem(file.name);
                            }
                        } else {
                            // remove file info when last upload time is over one day
                            localStorage.removeItem(file.name);
                        }
                    }
                    speedCalInfo.startTime = new Date().getTime();
                    var multipart_params_obj = {};
                    var ie = that.detectIEVersion();
                    // case IE 9-
                    // add accept in multipart params
                    if (ie && ie <= 9) {
                        multipart_params_obj.accept = 'text/plain; charset=utf-8';
                        logger.debug("add accept text/plain in multipart params");
                    }
                    // TODO: to support bput
                    // http://developer.qiniu.com/docs/v6/api/reference/up/bput.html
                    up.setOption({
                        'url': qiniuUploadUrl + '/mkblk/' + blockSize,
                        'multipart': false,
                        'chunk_size': chunk_size,
                        'required_features': "chunks",
                        'headers': {
                            'Authorization': 'UpToken ' + getUptoken(file)
                        },
                        'multipart_params': multipart_params_obj
                    });
                }
            } else {
                logger.debug("directUpload because uploader.runtime !== 'html5' || uploader.runtime !== 'flash' || !chunk_size");
                // direct upload if runtime is not html5
                directUpload(up, file, that.key_handler);
            }
        });

        logger.debug("bind BeforeUpload event");

        // bind 'UploadProgress' event
        // calculate upload speed
        uploader.bind('UploadProgress', function(up, file) {
            logger.trace("UploadProgress event activated");
            speedCalInfo.currentTime = new Date().getTime();
            var timeUsed = speedCalInfo.currentTime - speedCalInfo.startTime; // ms
            var fileUploaded = file.loaded || 0;
            if (speedCalInfo.isResumeUpload) {
                fileUploaded = file.loaded - speedCalInfo.resumeFilesize;
            }
            file.speed = (fileUploaded / timeUsed * 1000).toFixed(0) || 0; // unit: byte/s
        });

        logger.debug("bind UploadProgress event");

        // bind 'ChunkUploaded' event
        // store the chunk upload info and set next chunk upload url
        uploader.bind('ChunkUploaded', function(up, file, info) {
            logger.debug("ChunkUploaded event activated");
            logger.debug("file: ", file);
            logger.debug("info: ", info);
            var res = that.parseJSON(info.response);
            logger.debug("res: ", res);
            // ctx should look like '[chunk01_ctx],[chunk02_ctx],[chunk03_ctx],...'
            ctx = ctx ? ctx + ',' + res.ctx : res.ctx;
            var leftSize = info.total - info.offset;
            var chunk_size = up.getOption && up.getOption('chunk_size');
            chunk_size = chunk_size || (up.settings && up.settings.chunk_size);
            if (leftSize < chunk_size) {
                up.setOption({
                    'url': qiniuUploadUrl + '/mkblk/' + leftSize
                });
                logger.debug("up.setOption url: ", qiniuUploadUrl + '/mkblk/' + leftSize);
            }
            up.setOption({
                'headers': {
                    'Authorization': 'UpToken ' + getUptoken(file)
                }
            });
            localStorage.setItem(file.name, that.stringifyJSON({
                ctx: ctx,
                percent: file.percent,
                total: info.total,
                offset: info.offset,
                time: (new Date()).getTime()
            }));
        });

        logger.debug("bind ChunkUploaded event");

        var retries = qiniuUploadUrls.length;

        // if error is unkown switch upload url and retry
        var unknow_error_retry = function(file){
            if (retries-- > 0) {
                setTimeout(function(){
                    that.resetUploadUrl();
                    file.status = plupload.QUEUED;
                    uploader.stop();
                    uploader.start();
                }, 0);
                return true;
            }else{
                retries = qiniuUploadUrls.length;
                return false;
            }
        };

        // bind 'Error' event
        // check the err.code and return the errTip
        uploader.bind('Error', (function(_Error_Handler) {
            return function(up, err) {
                logger.error("Error event activated");
                logger.error("err: ", err);
                var errTip = '';
                var file = err.file;
                if (file) {
                    switch (err.code) {
                        case plupload.FAILED:
                            errTip = '上传失败。请稍后再试。';
                            break;
                        case plupload.FILE_SIZE_ERROR:
                            var max_file_size = up.getOption && up.getOption('max_file_size');
                            max_file_size = max_file_size || (up.settings && up.settings.max_file_size);
                            errTip = '浏览器最大可上传' + max_file_size + '。更大文件请使用命令行工具。';
                            break;
                        case plupload.FILE_EXTENSION_ERROR:
                            errTip = '文件验证失败。请稍后重试。';
                            break;
                        case plupload.HTTP_ERROR:
                            if (err.response === '') {
                                // Fix parseJSON error ,when http error is like net::ERR_ADDRESS_UNREACHABLE
                                errTip = err.message || '未知网络错误。';
                                if (!unknow_error_retry(file)) {
                                    return;
                                }
                                break;
                            }
                            var errorObj = that.parseJSON(err.response);
                            var errorText = errorObj.error;
                            switch (err.status) {
                                case 400:
                                    errTip = "请求报文格式错误。";
                                    break;
                                case 401:
                                    errTip = "客户端认证授权失败。请重试或提交反馈。";
                                    break;
                                case 405:
                                    errTip = "客户端请求错误。请重试或提交反馈。";
                                    break;
                                case 579:
                                    errTip = "资源上传成功，但回调失败。";
                                    break;
                                case 599:
                                    errTip = "网络连接异常。请重试或提交反馈。";
                                    if (!unknow_error_retry(file)) {
                                        return;
                                    }
                                    break;
                                case 614:
                                    errTip = "文件已存在。";
                                    try {
                                        errorObj = that.parseJSON(errorObj.error);
                                        errorText = errorObj.error || 'file exists';
                                    } catch (e) {
                                        errorText = errorObj.error || 'file exists';
                                    }
                                    break;
                                case 631:
                                    errTip = "指定空间不存在。";
                                    break;
                                case 701:
                                    errTip = "上传数据块校验出错。请重试或提交反馈。";
                                    break;
                                default:
                                    errTip = "未知错误。";
                                    if (!unknow_error_retry(file)) {
                                        return;
                                    }
                                    break;
                            }
                            errTip = errTip + '(' + err.status + '：' + errorText + ')';
                            break;
                        case plupload.SECURITY_ERROR:
                            errTip = '安全配置错误。请联系网站管理员。';
                            break;
                        case plupload.GENERIC_ERROR:
                            errTip = '上传失败。请稍后再试。';
                            break;
                        case plupload.IO_ERROR:
                            errTip = '上传失败。请稍后再试。';
                            break;
                        case plupload.INIT_ERROR:
                            errTip = '网站配置错误。请联系网站管理员。';
                            uploader.destroy();
                            break;
                        default:
                            errTip = err.message + err.details;
                            if (!unknow_error_retry(file)) {
                                return;
                            }
                            break;
                    }
                    if (_Error_Handler) {
                        _Error_Handler(up, err, errTip);
                    }
                }
                up.refresh(); // Reposition Flash/Silverlight
            };
        })(_Error_Handler));

        logger.debug("bind Error event");

        // bind 'FileUploaded' event
        // intercept the complete of upload
        // - get downtoken from downtoken_url if bucket is private
        // - invoke mkfile api to compose chunks if upload strategy is chunk upload
        uploader.bind('FileUploaded', (function(_FileUploaded_Handler) {
            return function(up, file, info) {

                logger.debug("FileUploaded event activated");
                logger.debug("file: ", file);
                logger.debug("info: ", info);
                var last_step = function(up, file, info) {
                    if (op.downtoken_url) {
                        // if op.dowontoken_url is not empty
                        // need get downtoken before invoke the _FileUploaded_Handler
                        var ajax_downtoken = that.createAjax();
                        ajax_downtoken.open('POST', op.downtoken_url, false);
                        ajax_downtoken.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                        ajax_downtoken.onreadystatechange = function() {
                            if (ajax_downtoken.readyState === 4) {
                                if (ajax_downtoken.status === 200) {
                                    var res_downtoken;
                                    try {
                                        res_downtoken = that.parseJSON(ajax_downtoken.responseText);
                                    } catch (e) {
                                        throw ('invalid json format');
                                    }
                                    var info_extended = {};
                                    plupload.extend(info_extended, that.parseJSON(info), res_downtoken);
                                    if (_FileUploaded_Handler) {
                                        _FileUploaded_Handler(up, file, that.stringifyJSON(info_extended));
                                    }
                                } else {
                                    uploader.trigger('Error', {
                                        status: ajax_downtoken.status,
                                        response: ajax_downtoken.responseText,
                                        file: file,
                                        code: plupload.HTTP_ERROR
                                    });
                                }
                            }
                        };
                        ajax_downtoken.send('key=' + that.parseJSON(info).key + '&domain=' + op.domain);
                    } else if (_FileUploaded_Handler) {
                        _FileUploaded_Handler(up, file, info);
                    }
                };

                var res = that.parseJSON(info.response);
                ctx = ctx ? ctx : res.ctx;
                // if ctx is not empty
                //      that means the upload strategy is chunk upload
                //      befroe the invoke the last_step
                //      we need request the mkfile to compose all uploaded chunks
                // else
                //      invalke the last_step
                logger.debug("ctx: ", ctx);
                if (ctx) {
                    var key = '';
                    logger.debug("save_key: ", op.save_key);
                     key = getFileKey(up, file, that.key_handler);
                     key = key ? '/key/' + that.URLSafeBase64Encode(key) : '';

                    var fname = '/fname/' + that.URLSafeBase64Encode(file.name);

                    logger.debug("op.x_vars: ", op.x_vars);
                    var x_vars = op.x_vars,
                        x_val = '',
                        x_vars_url = '';
                    if (x_vars !== undefined && typeof x_vars === 'object') {
                        for (var x_key in x_vars) {
                            if (x_vars.hasOwnProperty(x_key)) {
                                if (typeof x_vars[x_key] === 'function') {
                                    x_val = that.URLSafeBase64Encode(x_vars[x_key](up, file));
                                } else if (typeof x_vars[x_key] !== 'object') {
                                    x_val = that.URLSafeBase64Encode(x_vars[x_key]);
                                }
                                x_vars_url += '/x:' + x_key + '/' + x_val;
                            }
                        }
                    }

                    var url = qiniuUploadUrl + '/mkfile/' + file.size + key + fname + x_vars_url;

                    var ie = that.detectIEVersion();
                    var ajax;
                    if (ie && ie <= 9) {
                        ajax = new mOxie.XMLHttpRequest();
                        mOxie.Env.swf_url = op.flash_swf_url;
                    }else{
                        ajax = that.createAjax();
                    }
                    ajax.open('POST', url, false);
                    ajax.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
                    ajax.setRequestHeader('Authorization', 'UpToken ' + that.token);
                    var onreadystatechange = function(){
                        logger.debug("ajax.readyState: ", ajax.readyState);
                        if (ajax.readyState === 4) {
                            localStorage.removeItem(file.name);
                            var info;
                            if (ajax.status === 200) {
                                info = ajax.responseText;
                                logger.debug("mkfile is success: ", info);
                                last_step(up, file, info);
                            } else {
                                info = {
                                    status: ajax.status,
                                    response: ajax.responseText,
                                    file: file,
                                    code: -200,
                                    responseHeaders: ajax.getAllResponseHeaders()
                                };
                                logger.debug("mkfile is error: ", info);
                                uploader.trigger('Error', info);
                            }
                        }
                    };
                    if (ie && ie <= 9) {
                        ajax.bind('readystatechange', onreadystatechange);
                    }else{
                        ajax.onreadystatechange = onreadystatechange;
                    }
                    ajax.send(ctx);
                    logger.debug("mkfile: ", url);
                } else {
                    last_step(up, file, info.response);
                }

            };
        })(_FileUploaded_Handler));

        logger.debug("bind FileUploaded event");

        // init uploader
        uploader.init();

        logger.debug("invoke uploader.init()");

        logger.debug("init uploader end");

        return uploader;
    };

    /**
     * get url by key
     * @param  {String} key of file
     * @return {String} url of file
     */
    this.getUrl = function(key) {
        if (!key) {
            return false;
        }
        key = encodeURI(key);
        var domain = this.domain;
        if (domain.slice(domain.length - 1) !== '/') {
            domain = domain + '/';
        }
        return domain + key;
    };

    /**
     * invoke the imageView2 api of Qiniu
     * @param  {Object} api params
     * @param  {String} key of file
     * @return {String} url of processed image
     */
    this.imageView2 = function(op, key) {
        var mode = op.mode || '',
            w = op.w || '',
            h = op.h || '',
            q = op.q || '',
            format = op.format || '';
        if (!mode) {
            return false;
        }
        if (!w && !h) {
            return false;
        }

        var imageUrl = 'imageView2/' + mode;
        imageUrl += w ? '/w/' + w : '';
        imageUrl += h ? '/h/' + h : '';
        imageUrl += q ? '/q/' + q : '';
        imageUrl += format ? '/format/' + format : '';
        if (key) {
            imageUrl = this.getUrl(key) + '?' + imageUrl;
        }
        return imageUrl;
    };

    /**
     * invoke the imageMogr2 api of Qiniu
     * @param  {Object} api params
     * @param  {String} key of file
     * @return {String} url of processed image
     */
    this.imageMogr2 = function(op, key) {
        var auto_orient = op['auto-orient'] || '',
            thumbnail = op.thumbnail || '',
            strip = op.strip || '',
            gravity = op.gravity || '',
            crop = op.crop || '',
            quality = op.quality || '',
            rotate = op.rotate || '',
            format = op.format || '',
            blur = op.blur || '';
        //Todo check option

        var imageUrl = 'imageMogr2';

        imageUrl += auto_orient ? '/auto-orient' : '';
        imageUrl += thumbnail ? '/thumbnail/' + thumbnail : '';
        imageUrl += strip ? '/strip' : '';
        imageUrl += gravity ? '/gravity/' + gravity : '';
        imageUrl += quality ? '/quality/' + quality : '';
        imageUrl += crop ? '/crop/' + crop : '';
        imageUrl += rotate ? '/rotate/' + rotate : '';
        imageUrl += format ? '/format/' + format : '';
        imageUrl += blur ? '/blur/' + blur : '';

        if (key) {
            imageUrl = this.getUrl(key) + '?' + imageUrl;
        }
        return imageUrl;
    };

    /**
     * invoke the watermark api of Qiniu
     * @param  {Object} api params
     * @param  {String} key of file
     * @return {String} url of processed image
     */
    this.watermark = function(op, key) {
        var mode = op.mode;
        if (!mode) {
            return false;
        }

        var imageUrl = 'watermark/' + mode;

        if (mode === 1) {
            var image = op.image || '';
            if (!image) {
                return false;
            }
            imageUrl += image ? '/image/' + this.URLSafeBase64Encode(image) : '';
        } else if (mode === 2) {
            var text = op.text ? op.text : '',
                font = op.font ? op.font : '',
                fontsize = op.fontsize ? op.fontsize : '',
                fill = op.fill ? op.fill : '';
            if (!text) {
                return false;
            }
            imageUrl += text ? '/text/' + this.URLSafeBase64Encode(text) : '';
            imageUrl += font ? '/font/' + this.URLSafeBase64Encode(font) : '';
            imageUrl += fontsize ? '/fontsize/' + fontsize : '';
            imageUrl += fill ? '/fill/' + this.URLSafeBase64Encode(fill) : '';
        } else {
            // Todo mode3
            return false;
        }

        var dissolve = op.dissolve || '',
            gravity = op.gravity || '',
            dx = op.dx || '',
            dy = op.dy || '';

        imageUrl += dissolve ? '/dissolve/' + dissolve : '';
        imageUrl += gravity ? '/gravity/' + gravity : '';
        imageUrl += dx ? '/dx/' + dx : '';
        imageUrl += dy ? '/dy/' + dy : '';

        if (key) {
            imageUrl = this.getUrl(key) + '?' + imageUrl;
        }
        return imageUrl;
    };

    /**
     * invoke the imageInfo api of Qiniu
     * @param  {String} key of file
     * @return {Object} image info
     */
    this.imageInfo = function(key) {
        if (!key) {
            return false;
        }
        var url = this.getUrl(key) + '?imageInfo';
        var xhr = this.createAjax();
        var info;
        var that = this;
        xhr.open('GET', url, false);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                info = that.parseJSON(xhr.responseText);
            }
        };
        xhr.send();
        return info;
    };

    /**
     * invoke the exif api of Qiniu
     * @param  {String} key of file
     * @return {Object} image exif
     */
    this.exif = function(key) {
        if (!key) {
            return false;
        }
        var url = this.getUrl(key) + '?exif';
        var xhr = this.createAjax();
        var info;
        var that = this;
        xhr.open('GET', url, false);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                info = that.parseJSON(xhr.responseText);
            }
        };
        xhr.send();
        return info;
    };

    /**
     * invoke the exif or imageInfo api of Qiniu
     * according with type param
     * @param  {String} ['exif'|'imageInfo']type of info
     * @param  {String} key of file
     * @return {Object} image exif or info
     */
    this.get = function(type, key) {
        if (!key || !type) {
            return false;
        }
        if (type === 'exif') {
            return this.exif(key);
        } else if (type === 'imageInfo') {
            return this.imageInfo(key);
        }
        return false;
    };

    /**
     * invoke api of Qiniu like a pipeline
     * @param  {Array of Object} params of a series api call
     * each object in array is options of api which name is set as 'fop' property
     * each api's output will be next api's input
     * @param  {String} key of file
     * @return {String|Boolean} url of processed image
     */
    this.pipeline = function(arr, key) {
        var isArray = Object.prototype.toString.call(arr) === '[object Array]';
        var option, errOp, imageUrl = '';
        if (isArray) {
            for (var i = 0, len = arr.length; i < len; i++) {
                option = arr[i];
                if (!option.fop) {
                    return false;
                }
                switch (option.fop) {
                    case 'watermark':
                        imageUrl += this.watermark(option) + '|';
                        break;
                    case 'imageView2':
                        imageUrl += this.imageView2(option) + '|';
                        break;
                    case 'imageMogr2':
                        imageUrl += this.imageMogr2(option) + '|';
                        break;
                    default:
                        errOp = true;
                        break;
                }
                if (errOp) {
                    return false;
                }
            }
            if (key) {
                imageUrl = this.getUrl(key) + '?' + imageUrl;
                var length = imageUrl.length;
                if (imageUrl.slice(length - 1) === '|') {
                    imageUrl = imageUrl.slice(0, length - 1);
                }
            }
            return imageUrl;
        }
        return false;
    };
}

var Qiniu = new QiniuJsSDK();

global.Qiniu = Qiniu;

global.QiniuJsSDK = QiniuJsSDK;

})( window );
/**
 * Created by huyuqiong on 2016/12/17.
 */
define("js.detail", function (req,exp) {
    "use strict";
	exp.getTemplate = function($){var buf = [];
buf.push('<div>    <div data-view="header"></div>    <div data-view="leftNavDe"></div>    ');
if(this.page=="video"){
buf.push('    <div data-view="videoDetail"></div>    ');
}else if(this.page=="static"){
buf.push('    <div data-view="staticDetail"></div>    ');
}
buf.push('</div>');
return buf.join("");};


    exp.paramType = "single"
    exp.onInit = function (done) {
        if(!sessionStorage.userId){
            exp.go("login");
        }else{
            if(exp.params[0]){
                exp.page = exp.params[0];
            }
            done();
        }

    }
});/**
 * Created by huyuqiong on 2016/12/17.
 */
define("js.header", function (req,exp) {
    "use strict";
	exp.getTemplate = function($){var buf = [];
buf.push('<div class="ui-header-con ui-com-clearFix">    <div class="ui-web-logo"></div>    <div class="ui-header-info ui-com-clearFix">        <div class="ui-web-space">            <p class="ui-web-space-val">                <span style="width:');
buf.push((this.space/500)*100);
buf.push('%;"></span>            </p>            <p class="ui-web-space-txt">');
buf.push(this.space);
buf.push('MB/500MB</p>        </div>        <div class="ui-header-user">            <span class="ui-header-user-icon"></span>            ');
buf.push(sessionStorage.name);
buf.push('        </div>        <div data-event="exit" class="ui-header-exit">            <span  class="ui-header-exit-icon"></span>            退出        </div>    </div></div>');
return buf.join("");};



    var service = req("utils.ajax");
    exp.space = 0;
    exp.onInit = function (done) {
        exp.getSpace(done);
    }

    exp.getSpace  = function (fn) {
        service.getUserInfo({userId:sessionStorage.userId},function (rs) {
            if(rs.status == "SUCCESS"){
                exp.space = Number(rs.data.space);
                fn&&fn();
            }else{
                exp.alert(rs.msg);
            }
        });
    }

    exp.exit = function () {
        sessionStorage.clear();
        exp.go("login");
    }
});/**
 * Created by huyuqiong on 2016/12/17.
 */
define("js.leftNav", function (req,exp) {
    "use strict";
	exp.getTemplate = function($){var buf = [];
    var page = this.parent.page;
buf.push('<div class="ui-left-nav">    <ul>        <li data-event="goPage:video" ');
if(page=="video"){
buf.push('class="on"');
}
buf.push('>            <div>                <span ');
if(page=="video"){
buf.push('class="ui-video-on-icon"');
}else{
buf.push('class="ui-video-off-icon"');
}
buf.push('></span>                <span class="ui-left-nav-txt">视频</span>            </div>        </li>        <li  data-event="goPage:statics" ');
if(page=="statics"){
buf.push('class="on"');
}
buf.push('>            <div>                <span  ');
if(page=="statics"){
buf.push('class="ui-count-on-icon"');
}else{
buf.push('class="ui-count-off-icon"');
}
buf.push('></span>                <span class="ui-left-nav-txt">统计</span>            </div>        </li>    </ul></div>');
return buf.join("");};


    exp.onInit = function () {
        
    }

    exp.goPage = function (page) {
        exp.go("list/"+page);
    }
});/**
 * Created by huyuqiong on 2016/12/17.
 */

define("js.leftNavDe", function (req,exp) {
    "use strict";
	exp.getTemplate = function($){var buf = [];
    var page = this.parent.page;
buf.push('<div class="ui-left-nav-de">    <ul>        <li data-event="goPage:video" ');
if(page=="video"){
buf.push('class="on"');
}
buf.push('>            <div>                <span ');
if(page=="video"){
buf.push('class="ui-video-on-icon"');
}else{
buf.push('class="ui-video-off-icon"');
}
buf.push('></span>            </div>        </li>        <li  data-event="goPage:static" ');
if(page=="statics"){
buf.push('class="on"');
}
buf.push('>            <div>                <span  ');
if(page=="static"){
buf.push('class="ui-count-on-icon"');
}else{
buf.push('class="ui-count-off-icon"');
}
buf.push('></span>            </div>        </li>    </ul></div>');
return buf.join("");};


    exp.onInit = function () {
        
    }

    exp.goPage = function (page) {
        exp.go("list/"+page);
    }
});/**
 * Created by huyuqiong on 2016/12/17.
 */
define("js.list", function(req,exp){
    "use strict";
	exp.getTemplate = function($){var buf = [];
buf.push('<div>    <div data-view="header"></div>    <div data-view="leftNav"></div>    ');
if(this.page=="video"){
buf.push('    <div data-view="video"></div>    ');
}else if(this.page=="statics"){
buf.push('    <div data-view="statics"></div>    ');
}
buf.push('    <div id="uploadFile-queue"></div>    <div data-part="statusPart">        ');
if(this.status!="none"){
buf.push('        ');
if(this.status=="uploading"){
buf.push('        <div class="ui-web-deal-state">            <div class="ui-web-deal-con ui-com-clearFix">                <div>                    <p>正在上传</p>                    <p class="ui-blue-txt">');
buf.push(this.video.hasUploadCount);
buf.push('/');
buf.push(this.video.totalUploadCount);
buf.push('</p>                </div>                <div data-event="showCloseUploadBox" class="ui-upload-ex-btn ui-export-btn">                </div>            </div>        </div>        <div class="ui-upload-box">            <div class="ui-upload-box-header">                <span data-event="closeUploadBox">╳</span>            </div>            <ul>                <li>                    <span>视频名称</span>                    <span>大小</span>                    <span>进度</span>                    <span>操作</span>                </li>                ');
var sn,src;for(var i in this.uploadCuList){
var item=this.uploadCuList[i];
sn=i*1+1;
src={length:this.uploadCuList.length, first:i==0, last:i==this.uploadCuList.length-1};
buf.push('                <li index="');
buf.push(i);
buf.push('">                    <span class="ui-upload-box-name">');
buf.push(item.name || item.video_name);
buf.push('</span>                    <span>');
buf.push(Math.round(item.size));
buf.push('M</span>                    <span>                        <span class="ui-upload-box-process ui-upload-box-process-');
buf.push(i);
buf.push('">                            <span ');
if(item.complete){
buf.push('style="width: 100%"');
}else{
buf.push('style="width: 0"');
}
buf.push('></span>                        </span>                    <span class="ui-upload-process-val-');
buf.push(i);
buf.push('">');
if(item.complete){
buf.push('100%');
}else{
buf.push('0%');
}
buf.push('</span>                    </span>                    ');
if(!item.complete){
buf.push('                    <span class="ui-upload-box-stop ui-upload-box-stop-');
buf.push(i);
buf.push('"></span>                    ');
}
buf.push('                </li>                ');
}
buf.push('            </ul>        </div>        ');
}else if(this.status=="success"){
buf.push('        <div class="ui-web-deal-state">            上传成功！        </div>        ');
}
buf.push('        ');
}
buf.push('    </div></div>');
return buf.join("");};


    exp.status = "none";
    exp.page="video";
    exp.uploadCuList = [];
    exp.uploadList = []
    exp.paramType = "single";
    exp.onInit = function (done) {
        if(!sessionStorage.userId){
            exp.go("login");
        }else{
            if(exp.params[0]){
                exp.page = exp.params[0];
            }
            done();
        }

    }
    exp.stopUpload = function (index) {

    }

    exp.showCloseUploadBox = function () {
        if(exp.$element.hasClass("ui-export-btn")){
            exp.closeUploadBox();
        }else{
            exp.showUploadBox();
        }
    }

    exp.closeUploadBox = function () {
        $(".ui-upload-box").hide();
        $(".ui-upload-ex-btn").removeClass("ui-export-btn").addClass("ui-unexport-btn");
    }
    exp.showUploadBox = function () {
        $(".ui-upload-box").show();
        $(".ui-upload-ex-btn").removeClass("ui-unexport-btn").addClass("ui-export-btn");;
    }
});/**
 * Created by huyuqiong on 2016/12/16.
 */
define("js.login", function(req,exp){
    "use strict";
	exp.getTemplate = function($){var buf = [];
buf.push('<div class="ui-login-con">    <div class="ui-login-left">        <div class="ui-login-left-bg"></div>    </div>    <div class="ui-login-right">        <div class="ui-login-form">            <div class="ui-web-logo"> </div>            <div class="ui-web-input">                <span class="ui-user-icon ui-com-clearFix"></span>                <input data-event="blur>hideError" data-bind="args.account" type="text"/>            </div>            <div class="ui-web-input ui-com-clearFix">                <span class="ui-lock-icon"></span>                <input data-event="blur>hideError" data-bind="args.password" type="password"/>            </div>            <input type="text" data-event="blur>hideError" data-bind="getVerifyCode" class="getVerifyCode" placeholder="验证码"/>            <img class="getVerify"><div id="noclear" data-event="changecode">换一张</div>            <div class="ui-error-con" id="login_error_msg">                <span class="ui-error-icon"></span>                <span class="ui-error-text">请输入正确的用户名或密码或验证码</span>            </div>            <div data-event="resetpassword" class="clickgo">忘记密码</div>            <div data-event="login" class="ui-web-btn">登录</div>            <div data-event="register" class="clickgo" style="text-align:center;">立即注册</div>        </div>        <div class="ui-procol-des">            <p class="ui-order-h-des">                <span>用户协议</span>                <span>内容版权</span>            </p>            <p class="ui-order-l-des">Copyright @ 2017 Beijing Moshanghua Tech Co., Ltd. All rights reserved</p>        </div>    </div></div>');
return buf.join("");};



    var service = req("utils.ajax");
    exp.getVerifyCode="";
    exp.args = {
        password:"",
        account:""
    }
    exp.onInit = function (done) {  

        // 获取验证码
        exp.changecode();
        if(sessionStorage.userId){
            exp.go("list");
        }else {
            done();
        }       
    }

    var lock=true;
    exp.login = function () {
        if (!validate()) {
            $(".ui-error-con").show();
            return false;
        };
        if (lock) {
            lock=false;
            service.verifyCheck({
                code:exp.getVerifyCode,
                ckey:$(".getVerify").attr("ckey")
            },function(rs){
                if (rs.status=="SUCCESS") {
                    service.login(exp.args,function (resdata) {
                        lock=true;
                        if(resdata.status == "SUCCESS"){
                            sessionStorage.userId =localStorage.userId= resdata.data.userId;
                            sessionStorage.name = resdata.data.name;
                            exp.go("list");
                        }else{
                            exp.changecode();
                            $(".ui-error-con").show().html(resdata.msg);
                        }
                    });
                }else{
                    lock=true;
                    $(".ui-error-con").show().html(rs.msg);
                }
            })
        };
    }

    exp.register = function(){
        exp.go("register");
    }

    exp.resetpassword=function(){
        exp.go("resetPassword");
    }

    exp.hideError = function () {
        $(".ui-error-con").hide();
    }

    exp.changecode=function(){
        //获取验证码
        service.getVerify(function(data){
            $(".getVerify").attr("src",'data:image/png;base64,' + data.data.code);
            $(".getVerify").attr("ckey",data.data.ckey);
        })
    }

    const EMAIL=/^[\w\-]+@([\w\-]+\.)+(com|net|cn|com\.cn|cc|info|me|org)$/;
    const PASSWORD=/^[A-Za-z0-9_]{6,20}$/;
    // 验证是否合法字符
    function validate(){
        if (!EMAIL.test(exp.args.account)) {
            return false;
        };
        if (!PASSWORD.test(exp.args.password)) {
            return false;
        };
        if (exp.getVerifyCode=="") {
           return false;
        };
        return true;
    }
});/**
 * Created by hyq on 2016/4/7.
 */
define("js.page", function(req,exp){
    "use strict";
	exp.getTemplate = function($){var buf = [];
    var lists = this.lists;
buf.push('<div>    <div class="ui-page-list">        <p data-event="goPage:');
buf.push(lists.cursor-1);
buf.push('">上一页</p>        ');
if(lists.page_count>10){
buf.push('        <p ');
if(lists.cursor==1){
buf.push('class="current-page"');
}
buf.push(' data-event="goPage:1">1</p>        ');
if(lists.cursor<4){
buf.push('        <p ');
if(lists.cursor==2){
buf.push('class="current-page"');
}
buf.push(' data-event="goPage:2">2</p>        <p ');
if(lists.cursor==3){
buf.push('class="current-page"');
}
buf.push(' data-event="goPage:3">3</p>        <p ');
if(lists.cursor==4){
buf.push('class="current-page"');
}
buf.push(' data-event="goPage:4">4</p>        <p>...</p>        ');
}else if(lists.cursor==4){
buf.push('        <p ');
if(lists.cursor==2){
buf.push('class="current-page"');
}
buf.push(' data-event="goPage:2">2</p>        <p ');
if(lists.cursor==3){
buf.push('class="current-page"');
}
buf.push(' data-event="goPage:3">3</p>        <p ');
if(lists.cursor==4){
buf.push('class="current-page"');
}
buf.push(' data-event="goPage:4">4</p>        <p ');
if(lists.cursor==5){
buf.push('class="current-page"');
}
buf.push(' data-event="goPage:5">5</p>        <p>...</p>        ');
}else if(lists.cursor>4&&(lists.cursor<(lists.page_count-3))){
buf.push('        <p>...</p>        <p ');
if(lists.cursor==lists.cursor-2){
buf.push('class="current-page"');
}
buf.push(' data-event="goPage:');
buf.push(lists.cursor-2);
buf.push('">');
buf.push(lists.cursor-2);
buf.push('</p>        <p ');
if(lists.cursor==lists.cursor-1){
buf.push('class="current-page"');
}
buf.push('  data-event="goPage:');
buf.push(lists.cursor-1);
buf.push('">');
buf.push(lists.cursor-1);
buf.push('</p>        <p ');
if(lists.cursor==lists.cursor){
buf.push('class="current-page"');
}
buf.push('  data-event="goPage:');
buf.push(lists.cursor);
buf.push('">');
buf.push(lists.cursor);
buf.push('</p>        <p ');
if(lists.cursor==lists.cursor+1){
buf.push('class="current-page"');
}
buf.push('  data-event="goPage:');
buf.push(lists.cursor+1);
buf.push('">');
buf.push(lists.cursor+1);
buf.push('</p>        <p>...</p>        ');
}else if(lists.cursor>=(lists.page_count-3)){
buf.push('        <p>...</p>        <p ');
if(lists.cursor==lists.page_count-4){
buf.push('class="current-page"');
}
buf.push(' data-event="goPage:');
buf.push(lists.page_count-4);
buf.push('">');
buf.push(lists.page_count-4);
buf.push('</p>        <p ');
if(lists.cursor==lists.page_count-3){
buf.push('class="current-page"');
}
buf.push(' data-event="goPage:');
buf.push(lists.page_count-3);
buf.push('">');
buf.push(lists.page_count-3);
buf.push('</p>        <p ');
if(lists.cursor==lists.page_count-2){
buf.push('class="current-page"');
}
buf.push(' data-event="goPage:');
buf.push(lists.page_count-2);
buf.push('">');
buf.push(lists.page_count-2);
buf.push('</p>        <p ');
if(lists.cursor==lists.page_count-1){
buf.push('class="current-page"');
}
buf.push(' data-event="goPage:');
buf.push(lists.page_count-1);
buf.push('">');
buf.push(lists.page_count-1);
buf.push('</p>        ');
}
buf.push('        <p ');
if(lists.cursor==lists.page_count){
buf.push('class="current-page"');
}
buf.push(' data-event="goPage:');
buf.push(lists.page_count);
buf.push('">');
buf.push(lists.page_count);
buf.push('</p>        ');
}else{
buf.push('        ');
 for(var i=1;i<=lists.page_count;i++){ 
buf.push('        <p ');
if(lists.cursor==i){
buf.push('class="current-page"');
}
buf.push(' data-event="goPage:');
buf.push(i);
buf.push('">');
buf.push(i);
buf.push('</p>        ');
 }
buf.push('        ');
}
buf.push('        <p data-event="goPage:');
buf.push(lists.cursor+1);
buf.push('">下一页</p>    </div></div>');
return buf.join("");};


    exp.lists = {
        cursor:0,                   //当前页数
        page_count:0,               //总页数
        total:0,                    //总条数
        step:0                      //每页显示数量
    };

    /*初始化数据*/
    exp.onInit = function(done){
        exp.lists.cursor = exp.parent.lists.cursor||0;
        exp.lists.page_count = exp.parent.lists.page_count||0;
        exp.lists.total = exp.parent.lists.total||0;
        exp.lists.step = exp.parent.lists.step||0;
        done();
    };

    /*跳转页面*/
    exp.goPage = function(page){
        var _page = parseInt(page);
        if(_page<1 || _page>exp.lists.page_count)
            return;
        if(exp.lists.cursor !== _page){
            document.body.scrollTop=100;
            exp.lists.cursor = _page;
            if(exp.parent.goPage !== undefined){
                //先加载翻页数据再变化页码
                exp.parent.goPage(_page,exp.render);
            }else{
                //直接变化页码
                exp.render();
            }
        }
    }
});/**
 * Created by huyuqiong on 2016/12/16.
 */
define("js.register", function(req,exp){
    "use strict";
	exp.getTemplate = function($){var buf = [];
buf.push('<div class="register-background">');
if(!this.registerSuccess){
buf.push('<div class="ui-register-con ui-default-con" ');
if(this.registerResult){
buf.push('style="display: none"');
}
buf.push('>        <!--<div class="ui-login-form">-->    <div class="ui-login-form" style="margin-top:50px !important;">        <div class="ui-web-logo"> </div>        <div class="ui-register-input">            <div class="label">邮箱<span class="explain">邮箱作为注册账号的账户名称</span></div>            <input data-event="blur>hideError" data-bind="args.email" type="text"/>            <div class="label">电话号码</div>            <input data-event="blur>hideError" data-bind="args.tel" type="number"/>            <div class="label">公司名称<span class="explain">英文数字或汉字[3-20字符，不分大小写]</span></div>            <input data-event="blur>hideError" data-bind="args.companyName" type="text"/>            <div class="label">密码<span class="explain">英文、数字下划线[6-20位区分大小写]</span></div>            <input data-event="blur>hideError" data-bind="args.password" type="password"/>            <div class="label">验证码</div>            <input type="text" data-event="blur>hideError" data-bind="registerVerifyCode" id="registerVerifyCode" placeholder="验证码"/>            <img class="registerVerify"><div id="registernoclear">看不清？<span data-event="changecode">换一张</span></div>        </div>        <div class="ui-error-text"></div>        <div data-event="register" class="ui-web-btn">同意协议并注册</div>    </div>    <div style="text-align:center;color: #808080;">已经有账号了？<span data-event="login" class="at_once">立即登录</span></div>    <div class="ui-procol-des">        <p class="ui-order-h-des">            <span>用户协议</span>            <span>内容版权</span>        </p>        <p class="ui-order-l-des">Copyright @ 2017 Ltd.All rights reserved</p>    </div></div><!-- 激活的页面 --><div class="ui-register-con ui-registerResult-con" ');
if(!this.registerResult){
buf.push('style="display: none"');
}
buf.push('>        <h4>激活</h4>    <div>确认邮件已发送</div>    <div class="email"></div>    <div>请登录您的邮箱激活账号，完成注册</div>    <h5>没有收到邮件？</h5>    <div class="problem">        <div>1.请检查邮箱地址是否正确<span data-event="rewrite">重新填写</span></div>        <div>2.检查您的邮箱里的“垃圾邮件”分类</div>        <div>3.若仍未收到确认邮件，请尝试<span data-event="resend">重新发送</span></div>    </div></div>');
}
buf.push('<!-- 注册成功的提示 --><div class="ui-register-con registerSuccess" ');
if(!this.registerSuccess){
buf.push('style="display: none"');
}
buf.push('>    <div id="activationsuccess"></div>    <div class="action">激活中</div>    <div class="content" style="display:none;">        <div><span id="endtime">5</span>秒后跳转到登录页</div>        <button data-event="login">立即登录</button>    </div>    </div></div>');
return buf.join("");};



    var service = req("utils.ajax");

    exp.registerResult=false;
    exp.registerSuccess=false;
    exp.registerVerifyCode="";
    exp.args = {
        password:"",
        email:"",
        tel:"",
        companyName:"",
        registerFrom:"100",
    }
    exp.onInit = function (done) {
        exp.changecode();

        //如果邮箱激活进来
        //url="www.test.com/#register/activation/code/user_id/fasdfad"
        var dress=window.location.href;
        if (dress.indexOf("activation/")>0) {
            exp.registerSuccess=true;
            var start=dress.indexOf("activation/")+11;
            var code=dress.substring(start,dress.indexOf("/user_id"));
            var data={};
            data.code=code;
            data.userId=dress.substring(dress.lastIndexOf("/")+1);
            data.registerFrom="100",
            data.type="100";
            service.activation(data,function (rs) {
                if(rs.status == "SUCCESS"){
                    $(".registerSuccess .action").html("注册成功");
                    $(".registerSuccess .content").show();
                    $("#activationsuccess").addClass("success_icon");
                    var time=setInterval(function(){
                        var value=parseInt($("#endtime").text());
                        if (value==0) {
                            clearInterval(time);
                            exp.login();
                        }else{
                            value--;
                           $("#endtime").html(value) 
                        }
                    },1000);
                }else{
                    $(".registerSuccess .action").html("激活失败").show();
                }
            });
        }else{
           exp.registerSuccess=false; 
        }
        done();
    }
    var lock=true;
    exp.register = function () {
        if (!validate()) {
            return false;
        };
        if (lock) {
            lock=false;
            service.verifyCheck({
                code:exp.registerVerifyCode,
                ckey:$(".registerVerify").attr("ckey")
            },function(rs){
                if (rs.status=="SUCCESS") {
                    registersend();
                }else{
                    lock=true;
                    $(".ui-error-text").html("验证码错误").show();
                }
            })
        };
    }

    exp.login=function(){
        exp.go("login");
    }

    exp.rewrite=function(){
        $(".ui-registerResult-con").hide();
        $(".ui-default-con").show();
    }
    // 重新激活
    exp.resend=function(){
        var senddata={};
        senddata.userId=localStorage.userId;
        senddata.email=exp.args.email;
        service.reSend(senddata,function (rs) {
            if(rs.status == "SUCCESS"){
                localStorage.userId = rs.data.userId;
            }
        });
    }

    exp.hideError = function () {
        $(".ui-error-text").hide();
    }

    exp.changecode=function(){
        //获取验证码
        service.getVerify(function(data){
            $(".registerVerify").attr("src",'data:image/png;base64,' + data.data.code);
            $(".registerVerify").attr("ckey",data.data.ckey);
        })
    }

    // 发送注册请求
    function registersend(){
        service.register(exp.args,function (rs) {
            lock=true;
            if(rs.status == "SUCCESS"){
                localStorage.userId = rs.data.userId;
                $(".ui-registerResult-con").show();
                $(".ui-default-con").hide();
                $(".ui-registerResult-con .email").html(exp.args.email);
            }else{
                exp.changecode();
                var msg=rs.msg|| "注册失败请重新注册";
                $(".ui-error-text").html(msg).show();
                $(".ui-error-text").html(rs.msg).show();
            }
        });
    }
    const EMAIL=/^[\w\-]+@([\w\-]+\.)+(com|net|cn|com\.cn|cc|info|me|org)$/;
    const TEL=/^1[3|4|5|8][0-9]\d{4,8}$/;
    const COMPANYY=/^[A-Za-z0-9]{3,20}$/;
    const PASSWORD=/^[A-Za-z0-9_]{6,20}$/;
    // 验证是否合法字符
    function validate(){
        var errormessage="";
        if (!EMAIL.test(exp.args.email)) {
            errormessage+=" 邮箱";
        };
        if (!TEL.test(exp.args.tel)) {
            errormessage+=" 电话号码";
        };
        if (exp.args.companyName.length>20 || exp.args.companyName.length<3) {
            errormessage+=" 公司名称";
        };
        if (!PASSWORD.test(exp.args.password)) {
            errormessage+=" 密码";
        };
        if (exp.registerVerifyCode=="") {
            errormessage+=" 验证码";
        };
        if (errormessage=="") {
            return true;
        }else{
            errormessage+="格式不合法"
            $(".ui-error-text").html(errormessage).show();
            return false;
        }
    }
});/**
 * Created by huyuqiong on 2016/12/16.
 */
define("js.resetPassword", function(req,exp){
    "use strict";
	exp.getTemplate = function($){var buf = [];
buf.push('<div class="ui-reset-con">    <div class="ui-resetpassword-con">    <div class="h3">重置密码</div>    <div class="step-con isactive">            <div class="number">1</div>            <span>填写账号></span>    </div>    <div class="step-con">            <div class="number">2</div>            <span>获取密码重置链接></span>    </div>    <div class="step-con">            <div class="number">3</div>            <span>设置新密码</span>    </div>    <input data-bind="account"  data-event="keyup>hideError" type="text" placeholder="用户名/邮箱" class="firststep" ');
if(this.thirdstep){
buf.push('style="display: none"');
}
buf.push('/>    <div ');
if(!this.thirdstep){
buf.push('style="display: none"');
}
buf.push('>        <input data-bind="newpassword" type="password" placeholder="新密码" data-event="keyup>hideError"/>        <input data-bind="confirmpassword" type="password" placeholder="确认密码" data-event="keyup>hideError"/>    </div>    <div class="passworderror"></div>    <button data-event="confirmclick">确定</button>    <div class="secondstep">            <p>密码重置链接已发送</p>            <p class="resetaccount"></p>            <p>请进入邮箱点击链接</p>    </div>    </div></div>');
return buf.join("");};



    var service = req("utils.ajax");
    exp.thirdstep=false;
    exp.account ="";
    exp.newpassword ="";
    exp.confirmpassword ="";
    var userId="";
    exp.onInit = function (done) {
        var dress=window.location.href;
        if (dress.indexOf("activation/")>0) {
            var start=dress.indexOf("activation/")+11;
            var code=dress.substring(start,dress.indexOf("/user_id"));
            var data={};
            data.code=code;
            data.userId=userId=dress.substring(dress.lastIndexOf("/")+1);
            data.registerFrom="100",
            data.type="200";
            exp.thirdstep=true;
            service.activation(data,function (rs) {
                if(rs.status == "SUCCESS"){
                    // console.log("SUCCESS")                 
                    $(".ui-resetpassword-con .step-con").removeClass("isactive");
                    $(".ui-resetpassword-con .step-con").eq(2).addClass("isactive");
                }else{
                    $(".passworderror").html("邮箱验证码出错重新发送").css("visibility","visible");
                    exp.go("resetPassword");
                }
            });
        }else{
            exp.thirdstep=false;
        }
        done();
    }
            
    exp.confirmclick = function () {
        if (!exp.hideError()) {
            return false;
        };
        var data={};
        if (exp.thirdstep) {
            data.user_id=userId;
            data.step=200;
            data.password=exp.newpassword;
        }else{
            data.userName=exp.account;
            data.step=100;
        }

        service.resetpassword(data,function (rs) {
            if(rs.status == "SUCCESS"){
                if (exp.thirdstep) {
                    exp.go("login");
                }else{
                    $(".resetaccount").html(exp.account);
                    $(".ui-resetpassword-con .step-con").removeClass("isactive")
                    $(".ui-resetpassword-con .step-con").eq(1).addClass("isactive")
                    $(".secondstep").show();
                    $(".ui-resetpassword-con button,.ui-resetpassword-con .firststep,.passworderror").hide();
                }
            }else{
                $(".passworderror").html(rs.msg).css("visibility","visible");
            }
        });

    }

    const EMAIL=/^[\w\-]+@([\w\-]+\.)+(com|net|cn|com\.cn|cc|info|me|org)$/;
    exp.hideError=function(){
        var flag=false;
        if (exp.thirdstep) {
            if (exp.newpassword==exp.confirmpassword && exp.newpassword!="") {
                flag=true;
            }else{
                $(".passworderror").html("密码不相等").css("visibility","visible");
            }
        }else{
            if (EMAIL.test(exp.account)) {
                flag=true;
            }else{
                $(".passworderror").html("邮箱格式不对").css("visibility","visible");
            }
        }
        if (flag) { 
            $(".passworderror").css("visibility","hidden");
            $(".ui-resetpassword-con button").css("backgroundColor","#0099ff");
        }else{
            $(".ui-resetpassword-con button").css("backgroundColor","#c1c1c1");
        }
        return flag;
    }
});/**
 * Created by huyuqiong on 2016/12/17.
 */
define("js.staticDetail", function (req,exp) {
    "use strict";
	exp.getTemplate = function($){var buf = [];
buf.push('<div class="ui-detail-con">    <div class="ui-detail-header" data-event="go:list/statics">        <div class="ui-web-back-con">            <span class="ui-web-back-icon"></span>            <span class="ui-content-header-txt">返回统计</span>        </div>    </div>    <div class="ui-statics-info ui-com-clearFix">        <div>            <span class="ui-web-label-icon"></span>            <span class="ui-web-statics-txt">标签总数</span>            <span class="ui-web-count">56</span>        </div>        <div>            <span class="ui-web-people-icon"></span>            <span class="ui-statics-txt">明星</span>            <span class="ui-web-count">33</span>        </div>        <div>            <span class="ui-web-tings-icon"></span>            <span class="ui-statics-txt">物体</span>            <span class="ui-web-count">16</span>        </div>        <div>            <span class="ui-web-place-icon"></span>            <span class="ui-statics-txt">场景</span>            <span class="ui-web-count">7</span>        </div>    </div>    <div class="ui-statics-form ui-com-clearFix">        <div class="ui-statics-form-con ui-floatR">            <div>                <span class="ui-time-tip">持续时间:</span>                <div data-part="rangePart" class="ui-range-con">                    <input data-bind="args.rangeVal" data-event="change>timeSelect" name="money" type="range" min="3" max="20" step="1" id="range">                    <div class="ui-statics-controlRange" style="width:');
buf.push(this.rangeWidth);
buf.push(';"></div>                    <div class="ui-range-tip">                        <span>3s</span>                        <span class="ui-orange-txt" style="left:');
buf.push(this.rangeWidth);
buf.push(';">');
if(this.args.rangeVal>3&&this.args.rangeVal<20){
buf.push(this.args.rangeVal);
buf.push('s');
}
buf.push('</span>                        <span>20s+</span>                    </div>                </div>            </div>            <div data-enter="search" class="ui-web-input ui-com-clearFix">                <span class="ui-search-icon"></span>                <input  placeholder="输入标签" data-bind="args.serachString" type="text"/>            </div>        </div>    </div>    <div class="ui-statics-list-con">        <div class="ui-statics-list-header">            <div class="ui-statics-list-header-txt">');
buf.push(this.itemKey);
buf.push('</div>        </div>        <ul class="ui-statics-list">            <li>                <span>视频名称</span>                <span>标签数</span>                <span>时长</span>                <span>                    广告机会                </span>            </li>            <li>                <span>刘涛</span>                <span>8</span>                <span>00:22:33</span>                <span>3</span>            </li>        </ul>    </div></div>');
return buf.join("");};


    exp.onInit = function (done) {
        exp.itemKey = exp.parent.params[1];
        done();
    }
    exp.timeSelect = function () {
        var _ele = exp.$element;
        var _min = _ele.attr("min");
        var _max = _ele.attr("max");
        var _val = _ele.val();
        console.log(_val);
        exp.rangeWidth = (_val-_min)/(_max-_min) * 100-0.4*_val+"%";
        exp.rangePart.render();
    }
    exp.args = {
        rangeVal:3,
        serachString:""
    }
    exp.search = function () {

    }
});/**
 * Created by huyuqiong on 2016/12/17.
 */
define("js.statics", function (req,exp) {
    "use strict";
	exp.getTemplate = function($){var buf = [];
buf.push('<div class="ui-content-con">    <div class="ui-content-header">        <span class="ui-content-header-txt">数据统计</span>    </div>    <div class="ui-statics-info ui-com-clearFix">        <div>            <span class="ui-web-label-icon"></span>            <span class="ui-web-statics-txt">标签总数</span>            <span class="ui-web-count">56</span>        </div>        <div>            <span class="ui-web-people-icon"></span>            <span class="ui-statics-txt">明星</span>            <span class="ui-web-count">33</span>        </div>        <div>            <span class="ui-web-tings-icon"></span>            <span class="ui-statics-txt">物体</span>            <span class="ui-web-count">16</span>        </div>        <div>            <span class="ui-web-place-icon"></span>            <span class="ui-statics-txt">场景</span>            <span class="ui-web-count">7</span>        </div>    </div>    <div class="ui-statics-form ui-com-clearFix">        <div class="ui-statics-form-con ui-floatR">            <div>                <span class="ui-time-tip">持续时间:</span>                <div data-part="rangePart" class="ui-range-con">                    <input data-bind="args.rangeVal" data-event="change>timeSelect" name="money" type="range" min="3" max="20" step="1" id="range">                    <div class="ui-statics-controlRange" style="width:');
buf.push(this.rangeWidth);
buf.push(';"></div>                    <div class="ui-range-tip">                        <span>3s</span>                        <span class="ui-orange-txt" style="left:');
buf.push(this.rangeWidth);
buf.push(';">');
if(this.args.rangeVal>3&&this.args.rangeVal<20){
buf.push(this.args.rangeVal);
buf.push('s');
}
buf.push('</span>                        <span>20s+</span>                    </div>                </div>            </div>            <div data-enter="search" class="ui-web-input ui-com-clearFix">                <span class="ui-search-icon"></span>                <input placeholder="输入标签" data-bind="args.serachString" type="text"/>            </div>        </div>    </div>    <div class="ui-statics-list-con">        <div class="ui-statics-list-header">            <div class="ui-statics-list-header-txt">明星</div>        </div>        <ul class="ui-statics-list">            <li>                <span>名称</span>                <span>标签数</span>                <span>时长</span>                <span>                    广告机会                    <span class="ui-orange-txt">(33)</span>                </span>            </li>            <li data-event="go:detail/static">                <span>刘涛</span>                <span>8</span>                <span>00:22:33</span>                <span>3</span>            </li>        </ul>    </div></div>');
return buf.join("");};


    exp.args = {
        rangeVal:3,
        serachString:""
    }
    exp.rangeWidth = 0;
    exp.onInit = function () {

    }
    exp.search = function () {

    }
    exp.timeSelect = function () {
        var _ele = exp.$element;
        var _min = _ele.attr("min");
        var _max = _ele.attr("max");
        var _val = _ele.val();
        console.log(_val);
        exp.rangeWidth = (_val-_min)/(_max-_min) * 100-0.4*_val+"%";
        exp.rangePart.render();
    }
});/**
 * Created by huyuqiong on 2016/12/17.
 */
define("js.video", function(req,exp){
    "use strict";
	exp.getTemplate = function($){var buf = [];
buf.push('<div class="ui-video-con ui-content-con">    <div class="ui-content-header ui-video-header ui-com-clearFix">        <span class="ui-content-header-txt">全部视频</span>        <div id="container" class="ui-relative-right">            <span id="pickfiles" class="ui-web-btn-mid ui-com-relative">                上传                <!--<input id="uploadFile" data-event="change>upload" class="ui-upload-btn" multiple type="file">-->            </span>            <div class="ui-web-input ui-com-clearFix">                <span class="ui-search-icon"></span>                <input id="searchInput" placeholder="输入视频名称" data-bind="args.serachString" type="text"/>                <span class="ui-clearBtn" data-event="clearSearch">×</span>            </div>            <div data-enter="search"></div>        </div>    </div>    <div data-part="listPart">    <p id="time"></p>    <ul class="ui-video-list">        ');
if(this.videoList.length>0){
buf.push('        <li>            <div class="ui-web-checkbox">                <input data-event="click>selectAll" type="checkbox" id="checkboxInput"/>                <label for="checkboxInput"></label>            </div>            <span>名称</span>            <span>上传时间</span>            <span>大小</span>            <span>标签数</span>            <span>状态</span>            <span>操作</span>        </li>        ');
var sn,src;for(var i in this.videoList){
var item=this.videoList[i];
sn=i*1+1;
src={length:this.videoList.length, first:i==0, last:i==this.videoList.length-1};
buf.push('        ');
 var index=Number(i+1);
buf.push('        <li>            <div class="ui-web-checkbox">                <input data-event="click>selectSingle:');
buf.push(item.id);
buf.push('" type="checkbox" name="checkboxInput" id="checkboxInput');
buf.push(index);
buf.push('"/>                <label for="checkboxInput');
buf.push(index);
buf.push('"></label>            </div>            <span class="ui-video-list-name">');
buf.push(item.name);
buf.push('</span>            <span>');
buf.push(item.uploadTime);
buf.push('</span>            <span>');
buf.push(item.videoSize);
buf.push('MB</span>            <span>');
if(item.tagNums==0){
buf.push('---');
}else{
buf.push(item.tagNums);
}
buf.push('</span>            ');
if(item.status=="200"){
buf.push('            <span>分析完成</span>            <span class="ui-video-control">                <span data-event="go:detail/video/');
buf.push(item.id);
buf.push('" class="ui-look-on-icon"></span>                <span data-event="downloadJSON:');
buf.push(item.jsonHref);
buf.push('" class="ui-upload-on-icon"></span>            </span>            ');
}else if(item.status=="100"){
buf.push('            <span class="ui-orange-txt"> 正在分析</span>            <span class="ui-video-control">                <span class="ui-look-off-icon"></span>                <span class="ui-upload-off-icon"></span>            </span>            ');
}
buf.push('        </li>        ');
}
buf.push('        ');
}else{
buf.push('        <li>            <span></span>            <span>名称</span>            <span>上传时间</span>            <span>大小</span>            <span>标签数</span>            <span>状态</span>            <span>操作</span>        </li>        <li class="ui-no-search-li">            没有文件！        </li>        ');
}
buf.push('    </ul>    <div style="display: none" data-event="delVideo" class="ui-web-del-btn ui-floatL">        <span class="ui-del-btn-icon"></span>        <span>删除</span>    </div>    ');
if(this.lists.page_count>1){
buf.push('    <div class="ui-floatR" data-view="page"></div>    ');
}
buf.push('    </div></div>');
return buf.join("");};



    var $ = req("jquery");
    var service = req("utils.ajax");
    var FileProgress = req("utils.fileprogress");
    var stopCount = 0;
    var searchList = [];
    var page_count = 0;
    var total = 0;
    req("../bower_components/plupload/js/moxie.js");
    req("../bower_components/plupload/js/plupload.dev.js");
    req("../bower_components/plupload/js/i18n/zh_CN.js");
    req("utils.qiniu");
    exp.videoList = [];
    exp.delList = [];
    exp.lists = {
        cursor:1,                   //当前页数
        page_count:0,               //总页数
        total:0,                    //总条数
        step:10                      //每页显示数量
    };

    exp.args = {
        step:10,
        serachString:"",
        userId:sessionStorage.userId
    };

    const LENGTH=50*1024*1024;

    exp.onInit = function (done) {
        exp.videoList = [];
        exp.args = {
            step:10,
            serachString:"",
            userId:sessionStorage.userId
        };
        exp.delList = [];
        exp.lists = {
            cursor:1,                   //当前页数
            page_count:0,               //总页数
            total:0,                    //总条数
            step:10                      //每页显示数量
        };
        exp.getList(exp.args,done);
    }

    exp.goPage = function (page,render) {
        exp.args.cursor = exp.lists.cursor =  page;
        if(!exp.serachStatus){
            exp.getList(exp.args,function () {
                render();
                exp.render();
            });
        }else{
            exp.args.size = exp.lists.step;
            exp.args.page = page;
            service.searchByName(exp.args,function (rs) {
                if(rs.status == "SUCCESS"){
                    rs.data.list && (exp.videoList = rs.data.list);
                    exp.lists.page_count = rs.data.maxPage;
                    exp.lists.total = rs.data.totalCount;
                    exp.serachStatus = true;
                }else{
                    exp.lists.page_count = 0;
                    exp.lists.total = 0;
                    exp.videoList = [];
                }
                render();
                exp.listPart.render();
            });
        }
    }

    exp.getList = function (args,fn) {
        service.getVideoList(args,function (rs) {
            if(rs.status == "SUCCESS"){
                total = exp.lists.total = rs.data.totalCount;
                page_count = exp.lists.page_count = exp.lists.total%exp.lists.step==0?parseInt(exp.lists.total/exp.lists.step):parseInt(exp.lists.total/exp.lists.step)+1;
                rs.data.size && (exp.lists.step = rs.data.size);
                rs.data.list && (exp.videoList = rs.data.list);
                searchList = exp.videoList;
                fn && fn();
            }else{
                exp.alert(rs.msg);
            }
        });
    }
    
    var currentFile;
    var isDeleteAll;
    var currentIndex = 0;
    exp._oldFilesCount = 0;
    exp.hasUploadCount = 0;
    exp.totalUploadCount = 0;
    var uploaded = [];
    exp._files = [];
    exp.onRender = function () {
        var uploader = Qiniu.uploader({
            runtimes: 'html5,flash,html4',
            browse_button: 'pickfiles',
            container: 'container',
            drop_element: 'container',
            max_file_size: '500mb',
            flash_swf_url: '../bower_components/plupload/js/Moxie.swf',
            dragdrop: true,
            chunk_size: '5mb',
            max_retries: 3,
            get_new_uptoken: true,
            filters:{
                mime_types : [
                    { title : "video files", extensions : "mp4,flv" },
                ]
            },
            multi_selection: !(mOxie.Env.OS.toLowerCase()==="ios"),
            uptoken_url: "/node_service/checkMsgFile",
            // uptoken_func: function(){
            //     var ajax = new XMLHttpRequest();
            //     ajax.open('GET', $('#uptoken_url').val(), false);
            //     ajax.setRequestHeader("If-Modified-Since", "0");
            //     ajax.send();
            //     if (ajax.status === 200) {
            //         var res = JSON.parse(ajax.responseText);
            //         console.log('custom uptoken_func:' + res.uptoken);
            //         return res.uptoken;
            //     } else {
            //         console.log('custom uptoken_func err');
            //         return '';
            //     }
            // },
            domain: 'http://resource.penn.dressplus.cn',
            // downtoken_url: '/downtoken',
            unique_names: false,
            save_key: false,
            // x_vars: {
            //     'id': '1234'
            // },
            auto_start: true,
            log_level: 5,
            init: {
                'FilesAdded': function(up, files) {
                    exp.totalUploadCount += files.length;
                    if(exp._files.length>0){
                        exp._oldFilesCount += exp._files.length;
                    }
                    var totalSize = 0;
                    plupload.each(files, function(file,index) {
                        FileProgress.bindEvent(file);
                        var _item = {};
                        _item.name = file.name;
                        _item.size = file.size/1024/1024;
                        totalSize += _item.size;
                        _item.status = true;
                        exp.parent.uploadCuList.push(_item);
                        exp._files.push(file);
                    });
                    service.getUserInfo({userId:sessionStorage.userId},function (rs) {
                        if(rs.status == "SUCCESS"){
                            var _space = 500 - Number(rs.data.space);
                            if( _space >= totalSize/1024/1024){
                                exp.parent.status = "uploading";
                                exp.parent.statusPart.render();
                                exp.bindDelEvt(up,files);
                            }else {
                                exp.alert("存储空间不足！");
                            }
                        }else{
                            exp.alert(rs.msg);
                        }
                    });


                },
                'BeforeUpload': function(up, file) {
                    currentFile = file;
                },
                'UploadProgress': function(up, file) {
                    var chunk_size = plupload.parseSize(this.getOption('chunk_size'));
                    FileProgress.countProgress(file,currentIndex);
                },
                'UploadComplete': function(up,flie) {
                    if(exp.hasUploaded(up)){
                        exp.parent.status = "success";
                        exp.parent.uploadCuList = uploaded;
                        exp.parent.statusPart.render();
                        exp._files = [];
                        exp.parent.uploadCuList = [];
                        currentIndex = 0;
                        exp.hasUploadCount = 0;
                        exp.totalUploadCount = 0;
                        setTimeout(function () {
                            exp.parent.status = "none";
                            exp.parent.statusPart.render();
                        },3000);
                    }else{
                        currentIndex = exp.parent.uploadCuList.length;
                    }
                },
                'FileUploaded': function(up, file, info) {
                    FileProgress.countProgress(file,currentIndex);
                    exp.hasUploadCount += 1;
                    exp.parent.uploadCuList[currentIndex].complete = true;
                    currentIndex += 1;
                    exp.parent.statusPart.render();
                    exp.bindDelEvt(up,up.files);
                    info = JSON.parse(info);
                    var _item = {};
                    _item.userId = sessionStorage.userId;
                    _item.name = file.name;
                    _item.size = Math.ceil(file.size/1024/1024);
                    _item.qnVideoId = info.persistentId;
                    if(info.url){
                        _item.url = info.url;
                    }else{
                        var domain = up.getOption('domain');
                        _item.url = `${domain}/${encodeURI(info.key)}`;
                    }
                    service.getUserInfo({userId:sessionStorage.userId},function (rs) {
                            if(rs.status == "SUCCESS"){
                                var _space = 500-Number(rs.data.space);
                                exp.parent.header.space =  Number(rs.data.space);
                                exp.parent.header.render();
                                if( _space >= _item.size){
                                    service.uploadVideo(_item,function (rs) {
                                        if(rs.status == "SUCCESS"){
                                            uploaded.push(rs.data);
                                            exp.getList(exp.args,exp.listPart.render);
                                        }else{
                                            exp.alert(rs.msg);
                                        }
                                    });
                                }else {
                                    up.stop();
                                    exp.alert("存储空间不足！");
                                }
                            }else{
                                exp.alert(rs.msg);
                                up.stop();
                            }
                    });

                },
                'Error': function(up, err, errTip) {
                    console.log(err,"err!!!!");
                    //up.stop();
                    exp.alert("上传失败！请重新上传！");
                }
            }
        });
        exp.dealClear();
    }

    exp.hasUploaded = function (up) {
        var result = true;
        for(var i in up.files){
            if(up.files[i].status != plupload.DONE){
                result = false;
                break;
            }
        }
        return result;
    }

    exp.bindDelEvt = function (up,files) {
        $(".ui-upload-box-stop").each(function(index) {
            var _this = $(this);
            var _index = _this.parent().attr('index');
            var _file = files[_index];

            _this.off().on('click', function () {
                exp.parent.uploadCuList.splice(_index,1);
                exp._files.splice(_index,1);
                up.removeFile(_file);
                exp.totalUploadCount -= 1;
                exp.parent.statusPart.render();
                if(exp.totalUploadCount == exp.hasUploadCount){
                    exp.parent.status = "success";
                    exp.parent.uploadCuList = uploaded;
                    exp.parent.statusPart.render();
                    exp._files = [];
                    exp.parent.uploadCuList = [];
                    currentIndex = 0;
                    exp.hasUploadCount = 0;
                    exp.totalUploadCount = 0;
                    setTimeout(function () {
                        exp.parent.status = "none";
                        exp.parent.statusPart.render();
                    },3000);
                }
                exp.bindDelEvt(up,up.files);
                /*   if (!$(this).hasClass("start")) {
                 $(this).addClass("start");
                 stopCount += 1;
                 exp.parent.uploadCuList[index].status = false;
                 var _index = exp.findNext(files, index);
                 up.stop();
                 if(_index!=null){
                 var _tem = up.files[0];
                 up.files[0] = up.files[_index];
                 up.files[_index] = _tem;
                 currentIndex = _index;
                 up.start();
                 }
                 } else {
                 up.stop();
                 exp.parent.uploadCuList[index] = true;
                 stopCount > 0 && (stopCount -= 1);
                 var _index = exp.findCurrent(up.files,_file.name);
                 if(_index!=null){
                 var _tem = up.files[_index];
                 up.files[_index] = up.files[0];
                 up.files[0] = _tem;
                 currentIndex = index;
                 up.start();
                 }

                 }*/
            });
        });
    }


    exp.selectSingle = function (id) {
        var _ele = exp.$element;
        if(_ele.is(':checked') && ($("[name='checkboxInput']:checked").length == exp.videoList.length)){
            $("#checkboxInput").prop("checked",true);
            $("#checkboxInput").parent().addClass("on");
        }else if(!_ele.is(':checked') &&  $("#checkboxInput").is(':checked')){
            $("#checkboxInput").prop("checked",false);
            $("#checkboxInput").parent().removeClass("on");
            exp.delListFromId(id);
        }
        if(_ele.is(':checked')){
            _ele.parent().addClass("on");
            exp.delList.push(id);
        }else{
            exp.delListFromId(id);
            _ele.parent().removeClass("on");
        }
        exp.showDelBtn();
    }


    exp.findCurrent = function (files,name) {
        var result = null;
        files.forEach(function (ele,index) {
            if(ele.name == name){
                result = index;
                return false;
            }

        });
        return result;
    }

    exp.findNext = function (files,index) {
        var result = null;
        for(var i=index;i<files.length;i++){
            if((files[i].status == 1)&&(exp.parent.uploadCuList[i].status)){
                result = i;
                break;
            }
        }

        if(!result){
            for(var i=0;i<index;i++){
                if((files[i].status == 1)&&(exp.parent.uploadCuList[i].status)){
                    result = i;
                    break;
                }
            }
        }

        return result;
    }
    exp.delListFromId = function (id) {
        exp.delList.forEach(function (ele,index) {
            if(ele == id){
                exp.delList.splice(index,1);
            }
        });
    }

    exp.selectAll = function () {
        var _ele = exp.$element;
        if(_ele.is(':checked')){
            exp.delList = [];
            $("[name='checkboxInput']").prop("checked",true);
            $("[name='checkboxInput']").parent().addClass("on");
            exp.videoList.forEach(function (ele) {
                exp.delList.push(ele.id);
            })
            _ele.parent().addClass("on");
        }else{
            $("[name='checkboxInput']").prop("checked",false);
            exp.delList = [];
            $("[name='checkboxInput']").parent().removeClass("on");
            _ele.parent().removeClass("on");
        }
        exp.showDelBtn();
    }

    exp.showDelBtn = function () {
        if(($("[name='checkboxInput']:checked").length>0))
            $(".ui-web-del-btn").show();
        else
            $(".ui-web-del-btn").hide();
    }


    exp.search = function () {
        if($("#searchInput").val()!=""){
            exp.args.size = exp.lists.step;
            //exp.args.page = exp.lists.cursor;
            service.searchByName(exp.args,function (rs) {
                if(rs.status == "SUCCESS"){
                    rs.data.list && (exp.videoList = rs.data.list);
                    exp.lists.page_count = rs.data.maxPage;
                    exp.lists.total = rs.data.totalCount;
                    exp.serachStatus = true;
                }else{
                    exp.lists.page_count = 0;
                    exp.lists.total = 0;
                    exp.videoList = [];
                }
                exp.listPart.render();
            });
        }
            /*else{
            exp.args.serachString = "";
            exp.serachStatus = false;
            exp.showOlderList();
            exp.listPart.render();
        }*/

    }
    
    exp.uploadProgressShow = function (files,loaded) {
        for(var i=0;i<files.length;i++){
            var _size = 0;
            var _csize = files[i].size;
            for(var j=0;j<=i;j++){
                _size += files[j].size;
            }
            if(loaded>=_size) {
                for (var k = 0; k <= i; k++) {
                    $(".ui-upload-box-process-" + k).children("span").css('width', "100%");
                    $(".ui-upload-process-val-" + k).text("100%");
                }
            }else{
                    var _tent = Math.round((1-(_size-loaded)/_csize)*100);
                    console.log(_tent);
                    $(".ui-upload-box-process-"+i).children("span").css('width',_tent + "%");
                    $(".ui-upload-process-val-"+i).text(_tent+"%");
                    break;
            }

        }

    }

    var filesList=[];


    exp.uploadA = function () {
        var el = document.getElementById("uploadFile");
        for(var i=0;i<el.files.length;i++){
            var _file = el.files[i];
            var _item = {};
            _item.name = _file.name;
            _item.size = Math.ceil(_file.size/1024/1024) + "MB";
            exp.parent.uploadCuList.push(_item);
            filesList.push(_file);
        }
        exp.parent.status = "uploading";
        exp.parent.statusPart.render();
        filesList.forEach(function (ele,index) {
            exp.uploadFiles(ele,index);
        });
    }

    exp.uploadFiles = function (file,index) {
        var form = new FormData();
        var dataset = document.body.dataset;
        var host = dataset && dataset.host || "";
        var ot;
        var oloaded;

        form.append("files",file);
        form.append("userId","123123132");
        form.append("orderId","11111");

        var oReq = new XMLHttpRequest();
        oReq.open( "POST", `${host}/service/checkMsgFile`, true );
        oReq.onload = function(oEvent) {
            var rs = JSON.parse(oReq.responseText);
            if (oReq.status == 200 && rs.success) {
                console.log("success");
            } else {
                console.log("fail");
            }
        };
        $(".ui-upload-box-stop-"+index).on('click',function () {
            var _this = $(this);
            exp.confirm("确定取消该文件的上传？",function () {
                oReq.abort();
                _this.remove();
            },function(){

            });
        });

        oReq.upload.onprogress= function (evt) {
            if (evt.lengthComputable) {//
                var _tent = Math.round(evt.loaded / evt.total * 100);
                $(".ui-upload-box-process-"+index).children("span").css('width',_tent + "%");
                $(".ui-upload-process-val-"+index).text(_tent + "%");
                if(_tent==100)
                $(".ui-upload-box-stop-"+index).hide();
            }

            var time = document.getElementById("time");
            var nt = new Date().getTime();//获取当前时间
            var pertime = (nt-ot)/1000; //计算出上次调用该方法时到现在的时间差，单位为s
            ot = new Date().getTime(); //重新赋值时间，用于下次计算

            var perload = evt.loaded - oloaded; //计算该分段上传的文件大小，单位b
            oloaded = evt.loaded;//重新赋值已上传文件大小，用以下次计算

            //上传速度计算
            var speed = perload/pertime;//单位b/s
            var bspeed = speed;
            var units = 'b/s';//单位名称
            if(speed/1024>1){
                speed = speed/1024;
                units = 'k/s';
            }
            if(speed/1024>1){
                speed = speed/1024;
                units = 'M/s';
            }
            speed = speed.toFixed(1);
            //剩余时间
            var resttime = ((evt.total-evt.loaded)/bspeed).toFixed(1);

            time.innerHTML = '，速度：'+speed+units+' ，剩余时间：'+resttime+'s';
            if(bspeed==0)
                time.innerHTML = '上传已取消';
            }

            oReq.send(form);
    }
    exp.downloadJSON = function (url) {
        var aLink = document.createElement('a');
        //var blob = new Blob([JSON.stringify(content)]);
        var _fileReg = new RegExp(".+/(.+)$");
        var evt = document.createEvent("HTMLEvents");
        evt.initEvent("click", false, false);
        aLink.download = url.match(_fileReg);
        aLink.href = url;
        aLink.dispatchEvent(evt);
        aLink.click();
    }
    exp.delVideo = function () {
      if(exp.delList.length>0) {
          service.deleteVideo({videoIds:exp.delList.toString()}, function (rs) {
                if(rs.status == "SUCCESS"){
                    if((exp.delList.length == exp.videoList.length) && exp.args.cursor>1){
                        exp.lists.cursor = exp.args.cursor -= 1;
                    }
                    service.getVideoList(exp.args,function (rs) {
                        if(rs.status == "SUCCESS"){
                            exp.lists.total = rs.data.totalCount;
                            exp.lists.page_count = exp.lists.total%exp.lists.step==0?parseInt(exp.lists.total/exp.lists.step):parseInt(exp.lists.total/exp.lists.step)+1;
                            if(rs.data.list)
                                searchList = exp.videoList = rs.data.list;
                            else
                                exp.videoList = [];
                            exp.parent.header.getSpace(function () {
                                exp.parent.header.render();
                                exp.render();
                                exp.autoTip("删除成功！");
                            });

                        }else{
                            exp.alert(rs.msg);
                        }

                    });

                }else{
                    exp.alert("删除失败！");
                }
          })
      }
    }
    exp.clearSearch = function () {
        $("#searchInput").val("");
        exp.args.serachString = "";
        exp.serachStatus = false;
        exp.showOlderList();
    }

    exp.showOlderList = function () {
        $(".ui-clearBtn").hide();
        exp.videoList = searchList;
        exp.lists.page_count = page_count;
        exp.lists.total = total;
        exp.listPart.render();
    }

    exp.dealClear = function(){
       $("#searchInput").on("input",function () {
           if($(this).val()!="")
               $(".ui-clearBtn").show();
           else
               exp.showOlderList();
       });
    }

    exp.autoTip = function (msg) {
        var tipHtml = $('<div class="sk-dialog-position">'
                     +'<div>'
                     +'<div class="sk-dialog">'
                     +'<div class="sk-dialog-top">'
                     +'<div class="sk-dialog-tit">'
                     +'<strong>提示</strong>'
                     +'</div>'
                     +'</div>'
                     +'<div class="sk-dialog-cont">'
                     +'<div class="sk-dialog-txt">'
                     +'<p>'+msg+'</p>'
                     +'</div>'
                     + '</div>'
                     +'<div class="sk-com-clear"></div>'
                     +'</div>    </div>    <div class="sk-dialog-bg"></div></div>');

        $("body").append(tipHtml);
        setTimeout(function () {
            tipHtml.remove();
        },1500)
    }
});/**
 * Created by huyuqiong on 2016/12/17.
 */
define("js.videoDetail", function (req,exp) {
    "use strict";
	exp.getTemplate = function($){var buf = [];
buf.push('<div class="ui-detail-con ui-videoDetail-con">    <div class="ui-detail-header">        <div class="ui-web-back-con" data-event="go:list/video">            <span class="ui-web-back-icon"></span>            <span class="ui-content-header-txt">返回列表</span>        </div>    </div>    <div class="ui-video-detail ui-com-clearFix">        <div class="ui-video-detail-video-con ui-com-clearFix">        <div class="ui-video-detail-video">            <video id="videoDom" height="auto" class="video-js vjs-default-skin vjs-big-play-centered"                   controls preload="auto">                ');
if(navigator.userAgent.indexOf("Firefox")){
buf.push('                <source src="');
buf.push(this.videoInfo.videoUrl);
buf.push('"  type="video/mp4"/>                ');
}else{
buf.push('                <source src="');
buf.push(this.videoInfo.videoUrl);
buf.push('"  type="video/ogg"/>                ');
}
buf.push('                您的浏览器不支持 HTML5 video 标签。            </video>            <div></div>                <div data-part="videoMask" class="ui-video-mask">                 </div>            <div data-part="senceMaskPart" class="ui-sence-mask">                <p>场景 ');
buf.push(this.senceMask.name);
buf.push('</p>            </div>        </div>        </div>        <div class="ui-video-detail-info">            <div data-part="videoInfoPart" class="ui-video-detail-face">                <p class="ui-video-name">');
buf.push(this.videoInfo.name);
buf.push('</p>                <p>上传时间：');
buf.push(this.videoInfo.uploadTime);
buf.push(' </p>                <p>视频长度：');
buf.push(this.videoInfo.duration);
buf.push('</p>                <p>文件大小：');
buf.push(this.videoInfo.size);
buf.push('MB</p>            </div>            <div class="ui-video-detail-depth">                <p>                    <span class="ui-web-tings-icon"></span>                    <span class="ui-statics-txt">物体</span>                    <span class="ui-web-count">');
buf.push(this.videoInfo.objectTagNums);
buf.push('</span>                </p>                <p>                    <span class="ui-web-place-icon"></span>                    <span class="ui-statics-txt">场景</span>                    <span class="ui-web-count">');
buf.push(this.videoInfo.sceneTagNums);
buf.push('</span>                </p>                <p>                    <span class="ui-web-people-icon"></span>                    <span class="ui-statics-txt">明星</span>                    <span class="ui-web-count">');
buf.push(this.videoInfo.starTagNums);
buf.push('</span>                </p>            </div>            <div data-event="downloadJSON:');
buf.push(this.videoInfo.jsonUrl);
buf.push('" class="ui-web-pad-btn">下载JSON</div>        </div>    </div>    <div class="ui-statics-form ui-com-clearFix ui-con-fw">        <div class="ui-statics-form-con ui-floatR">            <div>                <span class="ui-time-tip">持续时间:</span>                <div data-part="rangePart" class="ui-range-con">                    <input data-bind="args.rangeVal" data-event="change>timeSelect" name="money" type="range" min="0" max="20" step="1" id="range">                    <div class="ui-statics-controlRange" style="width:');
buf.push(this.rangeWidth);
buf.push(';"></div>                    <div class="ui-range-tip">                        <span>0s</span>                        <span class="ui-orange-txt" style="left:');
buf.push(this.rangeWidth);
buf.push(';">');
if(this.args.rangeVal>0&&this.args.rangeVal<20){
buf.push(this.args.rangeVal);
buf.push('s');
}
buf.push('</span>                        <span>20s+</span>                    </div>                </div>            </div>            <div class="ui-web-input ui-com-clearFix">                <span class="ui-search-icon"></span>                <input placeholder="输入标签" id="searchInput" data-bind="args.serachString" type="text"/>                <span class="ui-clearBtn" data-event="clearSearch">×</span>            </div>            <div data-enter="search"></div>        </div>    </div>        <div data-part="tagListPart">            ');
              var showS = false;               for(var t in this.searchResultList){                    showS = true;                }            
buf.push('            ');
if(this.searchResultListStatus&&!showS){
buf.push('            <div class="ui-con-fw ui-statics-list-con">                <ul class="ui-statics-list">                    <li class="ui-no-search-li">                        无搜索结果！                    </li>                </ul>            </div>            ');
}else{
buf.push('            ');
 var forTag = showS?this.searchResultList:this.videoInfo.tagInfo 
buf.push('            ');
var sn,src;for(var i in forTag){
var item=forTag[i];
sn=i*1+1;
src={length:forTag.length, first:i==0, last:i==forTag.length-1};
buf.push('            ');
 var _item = item 
buf.push('            <div class="ui-con-fw ui-statics-list-con">                <div class="ui-statics-list-header ui-com-clearFix">                    <div class="ui-statics-list-header-txt">');
buf.push(i=="objects"?"物体":(i=="star"?"明星":"场景"));
buf.push('</div>                    <div data-event="showHideAllDetail" class="ui-detail-all-export">－</div>                </div>                <ul class="ui-statics-list">                    <li>                        <span>名称</span>                        <span>标签数</span>                        <span>时长</span>                        <span>                    广告机会                    <span class="ui-orange-txt">(');
buf.push(_item.totalAdCount);
buf.push(')</span>                </span>                    </li>                    ');
var sn,src;for(var i in _item.tagList){
var item=_item.tagList[i];
sn=i*1+1;
src={length:_item.tagList.length, first:i==0, last:i==_item.tagList.length-1};
buf.push('                    ');
 var _citem = item 
buf.push('                    <li>                        <span>');
buf.push(_citem.tagName);
buf.push('</span>                        <span>                            ');
buf.push(_citem.tagCount);
buf.push('                         <span data-event="showHideDetail" class="ui-detail-unexport-icon"></span>                        </span>                        <span>');
buf.push(_citem.duration);
buf.push('</span>                        <span>');
buf.push(_citem.adCount);
buf.push('</span>                        <div class="ui-list-item-detail">                            ');
if(Array.isArray(_citem.tagPicList)){
buf.push('                            ');
var sn,src;for(var i in _citem.tagPicList){
var item=_citem.tagPicList[i];
sn=i*1+1;
src={length:_citem.tagPicList.length, first:i==0, last:i==_citem.tagPicList.length-1};
buf.push('                            ');
                                var _sitem = item;                                var imageUrl = _sitem.picUrl.match(/^http:/)?_sitem.picUrl:'http://'+_sitem.picUrl;                            
buf.push('                            <div>                                <img src="');
buf.push(imageUrl);
buf.push('">                                <p>开始时间 ／ ');
buf.push(_sitem.startTime);
buf.push('</p>                                <p>持续时间 ／ <span class="ui-orange-txt">');
buf.push(_sitem.duration);
buf.push('</span></p>                            </div>                            ');
}
buf.push('                            ');
}else{
buf.push('                            <div>                                <img src="');
buf.push('http://'+_citem.tagPicList.picUrl);
buf.push('">                                <p>开始时间 ／ ');
buf.push(_citem.tagPicList.startTime);
buf.push('</p>                                <p>持续时间 ／ <span class="ui-orange-txt">');
buf.push(_citem.tagPicList.duration);
buf.push('</span></p>                            </div>                            ');
}
buf.push('                        </div>                    </li>                    ');
}
buf.push('                </ul>            </div>            ');
}
buf.push('            ');
}
buf.push('        </div></div></div>');
return buf.join("");};



    var service = req("utils.ajax");
    var currentPlayTime = 0;
    var disappearTime = 0;
    var times = {};
    var pauseTime = 0;
    exp.args = {
        rangeVal:0,
        serachString:""
    }

    exp.senceMask = {};

    exp.playList = {};
    exp.masks = [];

    exp.rangeWidth = 0;

    exp.searchResultList = {};
    exp.searchResultListStatus = false;
    exp.mask = {
        width:0,
        height:0,
        x:0,
        y:0,
        text:""
    }
    exp.videoInfo = {
        name:"",
        objectTagNums:0,
        sceneTagNums:0,
        starTagNums:0,
        size:0,
        videoUrl:"",
        uploadTime:""
    };
    var doneStatus = false;
    var renderStatus = false;
    var playStatus = false;
    var hasStart = false;
    exp.onInit = function (done) {
        exp.playList = {};
        exp.masks = [];
        exp.senceMask = {};
        exp.rangeWidth = 0;

        exp.searchResultList = {};

        exp.mask = {
            width:0,
            height:0,
            x:0,
            y:0,
            text:""
        }
        exp.args = {
            rangeVal:0,
            serachString:""
        }
        exp.videoInfo = {
            name:"",
            objectTagNums:0,
            sceneTagNums:0,
            starTagNums:0,
            size:0,
            videoUrl:"",
            uploadTime:""
        };
        exp.parent.params[1] && (exp.args.videoId = exp.parent.params[1]);
        exp.searchResultListStatus = false;
        service.getVideoDetail(exp.args,function (rs) {
            if(rs.status == "SUCCESS"){
                exp.videoInfo = rs.data;
                exp.playList = rs.data.trailInfo;
                renderStatus = true;
                done();
            }else{
                exp.alert(rs.msg);
            }
        });
    }

    var firstPlay = false;

    exp.onRender = function () {
        if(renderStatus) {
            var Media = document.getElementById("videoDom");
            Media.addEventListener('loadedmetadata', function () {
                var _ew = $(".ui-video-detail-video").width()+ $(".ui-video-detail-info").width();
                var _aw = $(".ui-videoDetail-con").width();
                if(_ew > _aw ){
                    $(".ui-videoDetail-con").css("width",_ew + 60 + "px");
                }
                if($(this).height()>$(this).width()){
                    var _width = $(this).width()/2 + 20
                    $(".ui-video-detail-video").css("width",_width + 'px!important');
                    $(this).css("width",_width + 'px!important');
                }
            });
            Media.addEventListener("timeupdate",function (e) {
                var _n = Math.floor(e.currentTarget.currentTime);
                disappearTime = Math.round(e.currentTarget.currentTime * 1000);
                playStatus = true;
                currentPlayTime = _n;
                exp.dealMask(_n);
                //console.log(Math.floor(e.currentTarget.currentTime/exp.videoInfo.fps));
                exp.dealSenceMask(_n);
            });
            Media.addEventListener("play", function (e) {
                playStatus = true;
                hasStart = false;
                console.log("playings");
              /*  if(!firstPlay){
                    exp.dealMask(1000/exp.videoInfo.fps);
                    firstPlay = true;
                }else{
                    var sTime = new Date().getTime();
                    var _n = Math.floor(e.currentTarget.currentTime);
                    var _f = exp.videoInfo.fps;
                    var _time = _n * _f;
                    console.log(e.currentTarget);
                    if((_time-pauseTime>=_f)||(pauseTime-_time>=_f)){
                        Media.currentTime = _n;
                        currentPlayTime = _time;
                        $(".ui-video-mask").html("").hide();
                    }
                    var eTime = new Date().getTime();
                    exp.dealMask(1000/exp.videoInfo.fps-(eTime-sTime));
                }*/
            }, false);
            Media.addEventListener("pause", function (e) {
                console.log(currentPlayTime,"current");
                pauseTime = Math.round(e.currentTarget.currentTime * exp.videoInfo.fps);
                console.log(pauseTime,"pause");
                playStatus = false;
            }, false);
            Media.addEventListener("waitting", function (e) {
                pauseTime =  Math.round(e.currentTarget.currentTime * exp.videoInfo.fps);
                console.log("waitiing");
                playStatus = false;
            }, false);
        }
        exp.dealClear();
    }

    exp.dealTimes = function () {
        clearTimeout(maskTime);
        for(var o in times){
            clearInterval(times[o]);
            delete times[o];
        }
    }

    exp.dealMask = function (_time) {
        exp.runMask();
    }

    exp.runMask = function (flag) {
        if(playStatus){
            var _e = exp.playList[currentPlayTime];
            if(_e){
                $(".ui-video-mask").html("");
                $(".ui-video-mask").show();
                var count = 0;
                for(var i in _e){
                    exp.dealCMask(_e[i],count++,currentPlayTime);
                }
            }else{
                $(".ui-video-mask").html("");
                $(".ui-video-mask").hide();
            }
        }
    }

    exp.dealCMask = function (element,index,c) {
        if((!element.disappeaarTime) || (disappearTime <= element.disappeaarTime)) {
            var ele = element.shows[0];
            var mask = {};
            mask.text = ele.name;
            mask.width = Math.round(ele.width * 100);
            mask.height = Math.round(ele.height * (100+8));
            mask.x = Math.round(ele.x * 100);
            mask.y = Math.round(ele.y * 100 + 8);
            mask.i = c + '' + index;
            exp.addMask(mask);
            exp.moveMask(element, index, c, 1);
        }
    }

    exp.moveMask = function (element,index,c,count) {
            var mask = {};
            var ele = element.shows[count];
            if(ele){
                mask.text = ele.name;
                mask.width = Math.round(ele.width * 100);
                mask.height = Math.round(ele.height * (100+8));
                mask.x = Math.round(ele.x * 100);
                mask.y = Math.round(ele.y * 100 + 8);
                mask.i = c + '' + index;
                if(playStatus) {
                    setTimeout(function () {
                        if((element.disappeaarTime) && (disappearTime > element.disappeaarTime)){
                            console.log(element.disappeaarTime,disappearTime);
                            $('.ui-video-mask-con-'+mask.i).remove();
                        }else{
                            $('.ui-video-mask-con-'+mask.i).find(".ui-video-mask-tip").css({
                                left: mask.x + '%',
                                top: mask.y - 6  + '%'
                            });
                            $('.ui-video-mask-con-'+mask.i).find(".ui-video-mask-range").css({
                                left: mask.x + '%',
                                top: mask.y + '%',
                                width: mask.width + '%',
                                height: mask.height + '%'
                            });
                            count += 1;
                            if( element.shows[count]){
                                exp.moveMask(element,index,c,count);
                            }
                        }
                    }, 1000 / exp.videoInfo.fps);
                }
            }else{
                $('.ui-video-mask-con-'+mask.i).remove();
            }
    }

    exp.addMask =  function (mask) {
        $('.ui-video-mask-con-'+mask.i).remove();
        var tipLeft = Number(mask.x)>94?94:mask.x;
        var maskHtml =  $('<div class="ui-com-clearFix ui-video-mask-con-'+mask.i+'"><div style="left:'+tipLeft+'%;top:'+(Number(mask.y)-6)+'%" class="ui-video-mask-tip">'
            +'<div class="ui-video-mask-txt">'+mask.text+'</div>'
            +'<div class="ui-video-mask-trangle"></div>'
            +'</div>'
            +'<div style="width:'+mask.width+'%;height:'+mask.height+'%;left:'+mask.x+'%;top:'+mask.y+'%"  class="ui-video-mask-range ui-video-mask-range'+mask.i+'"></div></div>');
        $(".ui-video-mask").append(maskHtml);
    }

    exp.dealSenceMask = function (time) {
        exp.videoInfo.senceList.forEach(function (ele,index) {
            var _t =exp.formatTime(ele.startTime);
            var _te = exp.formatTime(ele.endTime);
            if( _t == time){
                exp.senceMask.name =  ele.name;
                exp.senceMaskPart.render().show();
                var _t = setTimeout(function () {
                    if(!playStatus){
                        exp.senceMaskPart.hide();
                        clearTimeout(_t);
                    }
                }, (_te - _t)*1000);
            }
        });
    }

    exp.timeSelect = function () {
        var _ele = exp.$element;
        var _min = _ele.attr("min");
        var _max = _ele.attr("max");
        var _val = _ele.val();
        exp.rangeWidth = (_val-_min)/(_max-_min) * 100-0.39*_val+"%";
        exp.rangePart.render();
        exp.search(true,_val);
    }

    exp.showHideAllDetail = function () {
        var _ele = exp.$element;
        if(_ele.text() == "－"){
            _ele.closest(".ui-statics-list-con").find(".ui-statics-list").hide();
            _ele.text("＋");
        }else{
            _ele.closest(".ui-statics-list-con").find(".ui-statics-list").show();
            _ele.text("－");
        }
    }

    exp.showHideDetail = function () {
        var _ele = exp.$element;
        if(_ele.hasClass("ui-detail-unexport-icon")){
            _ele.closest("li").find(".ui-list-item-detail").show();
            _ele.removeClass("ui-detail-unexport-icon").addClass("ui-detail-export-icon");
        }else{
            _ele.closest("li").find(".ui-list-item-detail").hide();
            _ele.removeClass("ui-detail-export-icon").addClass("ui-detail-unexport-icon");
        }
    }

    exp.formatTime = function (timeStr) {
        var times = timeStr.split(":");
        var hour = parseInt(times[0],10);
        var min = parseInt(times[1],10);
        var second = parseInt(times[2],10);
        return second + min*60 + hour*60*60;
    }

    exp.downloadJSON = function (url) {
        var aLink = document.createElement('a');
        //var blob = new Blob([JSON.stringify(content)]);
        var _fileReg = new RegExp(".+/(.+)$");
        var evt = document.createEvent("HTMLEvents");
        evt.initEvent("click", false, false);
        aLink.download = url.match(_fileReg);
        aLink.href = url;
        aLink.dispatchEvent(evt);
        aLink.click();
    }


    exp.search = function (flag,value) {
        if(($("#searchInput").val()!="")||flag) {
            service.searchByTag(exp.args, function (rs) {
                if (rs.status == "SUCCESS") {
                    exp.searchResultList = rs.data;
                } else {
                    exp.searchResultList = {};
                }
                exp.searchResultListStatus = true;
                exp.tagListPart.render();
            });
        }

    }

    exp.clearSearch = function () {
        $("#searchInput").val("");
        exp.args.serachString = "";
        exp.search(true);
    }

    exp.showOlderList = function () {
        $(".ui-clearBtn").hide();
        exp.searchResultListStatus = false;
        exp.searchResultList = {};
        exp.tagListPart.render();
    }

    exp.dealClear = function(){
        $("#searchInput").on("input",function () {
            if($(this).val()!="")
                $(".ui-clearBtn").show();
            else{
                exp.args.serachString = "";
                exp.search(true);
            }
        });
    }
});
﻿/**
 * 遮罩层插件
 */

define("sys.ui.mask",function (req, exp, module) {
	"use strict";
	exp.cssFile = "none";



exp.getTemplate = function($){var buf = [];
buf.push('﻿<div class="sk-mask" data-level="');
buf.push(this.level);
buf.push('">	<div class="sk-mask-bg" style="		opacity: ');
buf.push(this.opacity);
buf.push(';		background-color: ');
buf.push(this.bg);
buf.push(';	"></div>	<div class="sk-mask-text" style="	    ');
if(this.color){
buf.push('		color: ');
buf.push(this.color);
buf.push(';		');
}
buf.push('		');
if(this.pic){
buf.push('		background-image: url(');
buf.push(this.pic);
buf.push(');		background-repeat: no-repeat;		background-position: center center;		');
}
buf.push('	">');
buf.push(this.text);
buf.push('</div></div>');
return buf.join("");};


    var filter = req("sys.filter");

    //默认设置
    var mod = exp.model = {
        bg: "#000",				//背景色
        pic: "",				//图片
        color: "",				//文字颜色
        text: "",				//文字
        loading: false,			//是否loading
        opacity: 0.5,			//透明度
        time: 0				    //是否定时关闭
    };

    exp.pic = {
        loading: "30.gif"
    };

	//显示遮罩
	exp.showMask = function (ops) {
		if(typeof ops=="string"){
			mod.text = ops;
		}
		filter.mergeObj(mod, ops);
        mod.pic = ops.loading ? exp.pic.loading : "";
		//this.text && obj.css("line-height", this.args.box.height()+"px");

		exp.show();
		exp.render();
		mod.time && setTimeout(exp.hide, mod.time);
	};

});﻿/**
 * 弹框插件
 */

define("sys.ui.dialog",function (req, exp) {
	"use strict";
	exp.cssFile = "none";



exp.getTemplate = function($){var buf = [];
buf.push('<div class="sk-dialog-position">    <div>        <div class="sk-dialog">           <div class="sk-dialog-top">                <div class="sk-dialog-tit">                    <strong>');
buf.push(this.title);
buf.push('</strong>                </div>               ');
if(this.hasClose){
buf.push('               <div class="sk-dialog-close" data-event="hide"></div>               ');
}
buf.push('            </div>            <div class="sk-dialog-cont">                <div class="sk-dialog-txt" >                    ');
if(this.url==""){
buf.push('                    <p>');
buf.push(this.text);
buf.push('</p>                    ');
}else{
buf.push('                    <iframe src="');
buf.push(this.url);
buf.push('"></iframe>                    ');
}
buf.push('                </div>            </div>            <div class="sk-dialog-btn">                ');
if(this.hasCancel){
buf.push('                <div class="sk-dialog-cancel"  data-event="pickCancel">');
buf.push(this.cancelText);
buf.push('</div>                ');
}
buf.push('                ');
if(this.hasOk){
buf.push('                <div class="sk-dialog-ture" data-event="pickOk">');
buf.push(this.okText);
buf.push('</div>                ');
}
buf.push('                ');
var sn,src;for(var i in this.buttons){
var item=this.buttons[i];
sn=i*1+1;
src={length:this.buttons.length, first:i==0, last:i==this.buttons.length-1};
buf.push('                <div class="sk-dialog-cancel"  data-event="pickButton:');
buf.push(i);
buf.push('">');
buf.push(item);
buf.push('</div>                ');
}
buf.push('            </div>            <div class="sk-com-clear"></div>        </div>    </div>    <div class="sk-dialog-bg"></div></div>');
return buf.join("");};


    var filter = req("sys.filter");

	var mod = exp.model = {
        title: "提示",
        text: "内容",
        url: "",
        okText: "确定",
        cancelText: "取消",
        hasClose: false,
        hasOk: true,
        hasCancel : false,
        onOk: null,
        onCancel: null,
        onButton: null
    };

    exp.mediaStyle = true;
    exp.timer = null;

    //点击确定按钮
    exp.pickOk = function(){
        exp.timer && window.clearTimeout(exp.timer);
        exp.hide();
        mod.onOk && mod.onOk();
    };

    //点击取消按钮
    exp.pickCancel = function(){
        exp.hide();
        mod.onCancel && mod.onCancel();
    };

    //点击其他按钮
    exp.pickButton = function(index){
        exp.hide();
        mod.onButton && mod.onButton(index);
    };


    //警告框
    exp.alert = function(ops){
        if(typeof ops!="object") {
            ops = {text: ops};
            for(var i=1; i<arguments.length; i++){
               var v = arguments[i];
               typeof v == "number" && (ops.timeout = v);
               typeof v == "function" && (ops.onOk = v);
            }
        }
        ops.hasCancel = false;
        exp.showDialog(ops);
    };

    //确认框
    exp.confirm = function(ops){
        if(typeof ops!="object"){
            ops = {
                text: arguments[0],
                onOk: arguments[1],
                onCancel: arguments[2]
            };
        }
        ops.hasCancel = true;
        exp.showDialog(ops);
    };

    //显示对话框
    exp.showDialog = function(ops){
        filter.mergeObj(mod, ops);
        mod.onOk = ops.onOk || null;
        mod.onCancel = ops.onCancel || null;
        exp.show();
        exp.render();

        if(ops.timeout>0){
            exp.timer = window.setTimeout(exp.pickOk, ops.timeout);
        }
    };


});﻿/**
 * 提示框插件
 */

define("sys.ui.tip",function (req, exp) {
	"use strict";
	exp.cssFile = "none";



exp.getTemplate = function($){var buf = [];
buf.push('<div class="sk-tip">');
buf.push(this.ops.text);
buf.push('</div>');
return buf.join("");};



    exp.ops = {
        time: 3000
    };

    //设置Tip
    exp.setTip = function(ops){
        exp.ops = ops;
    };

    //警告框
    exp.showTip = function(ops){
        if(typeof ops=="string") {
            ops = {text: ops};
            exp.goPage = arguments[1];
        }
        for(var k in ops){
            exp.ops[k] = ops[k];
        }
        exp.render();
        exp.show();

        if(exp.ops.time){
            setTimeout(function(){
                exp.hide();
                exp.goPage && exp.go(exp.goPage);
            }, exp.ops.time);
        }
    };

});