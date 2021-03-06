var SCREEN = FlashDetectScreenSize ();

function FlashDetectScreenSize () {
    return {
        width:  window.innerWidth
            || document.documentElement.clientWidth
            || document.body.clientWidth,
        height: window.innerHeight
            || document.documentElement.clientHeight
            || document.body.clientHeight
    }
}

window.flashGlobal = {};
window.flashDocChoosed = document.body;
window.globalScope = {};

function Flash (dom, doc) {

    return new Promise(function(resolve,reject){
        window.flashDocChoosed = doc = doc 
            ? typeof doc === "string"
                ? document.getElementById(doc)
                : doc 
            : document.body;
        domBuilder(dom, doc);
        window.globalScope = window.flashGlobal = newProxy(dom);
        resolve(globalScope);
        reject("There was an error!")
    })

    function newProxy(obj){
        setTimeout(function(){
            assignSizeAndPositionToAll();
        })
        return new Proxy(obj, {
            get (target, key) {
                if (key === "element") return target.element;
                if (target[key]) {
                    if (typeof target[key] === 'object') {
                        return new Proxy(target[key], this)
                    } else {
                        return target[key];
                    }
                } else {
                    return false;
                }
            },
            set (target, key, value) {
                target[key] = value;
                var found = find(target.id);
                var childsPosition = false;
                switch (key) {
                    case "childs":;
                        found.element.innerHTML = "";
                        found.childs = typeof value === "object" 
                                                ? value.length
                                                    ? value
                                                    : [value]
                                                : [];
                        break;
                    default:;
                        if (!isNaN(Number(key))) {
                            found = found.parent;
                            childsPosition = Number(key);
                        }; break;
                }
                domBuilder(
                    found 
                        ? found.childs
                            ? found.childs
                            : found
                        : dom,
                    found
                        ? found.element
                        : doc,
                    childsPosition
                );     
                return true
            }
        })
    }

    function cssPseudo (domElement, elem, pseudo) {
        var style = elem.style || {};
        var eventIn, eventOut;
        switch (pseudo) {
            case "hover": eventIn = "mouseenter"; eventOut = "mouseleave"; break;
            case "focus": eventIn = "focus"; eventOut = "blur"; break;
            case "active": eventIn = "mousedown"; eventOut = "mouseup"; break;
        };
        domElement.addEventListener(eventIn, function(){
            style = find(elem.id).style;
            domElement.style = stringifyStyle(
                __c(style, elem[pseudo]),
                elem,
                domElement
            )
        })
        domElement.addEventListener(eventOut, function(){
            domElement.style = stringifyStyle(
                style, 
                elem,
                domElement
            )
        })
    }

    function domIdAssign (domObject) {
        let result = domObject;
        function recursive (obj) {
            try {
                obj = obj ? obj : result;
                obj.map(function(elem){
                    elem.id = "id" in elem ? elem.id : randomID();
                    if (elem.childs) recursive(elem.childs)
                })
            } catch (e) { return false }
        }
        recursive();
        return result;
    }

    function assignSizeAndPositionToAll() {
        function recursive (obj) {
            obj = obj ? obj : dom;
            try {
                obj.map(function(o){
                    find(o.id);
                    if (o.childs) recursive(o.childs);
                })
            } catch (e) {}
        }
        recursive()
    }

    function singleBuilder (elem, domElement) {
        elem.element = domElement;
        if (necessaryTagsCheck(elem)) {
            Object.keys(elem).map(function(item){
                try {
                    if (excludeTagsFromBuilding(item)) {
                        switch (item) {
                            case "style": domElement.setAttribute("style", domEvaluateString(stringifyStyle(elem[item], elem, domElement), elem)); break;
                            default: domElement.setAttribute(item, domEvaluateString(elem[item], elem));
                        }
                    } else {
                        switch (item) {
                            case "html": if (typeof elem[item] === "number") domElement.innerHTML = elem[item]; else domElement.innerHTML = domEvaluateString(elem[item], elem); break;
                            case "hover": cssPseudo (domElement, elem, "hover"); break;
                            case "focus": cssPseudo (domElement, elem, "focus"); break;
                            case "active": cssPseudo (domElement, elem, "active"); break;
                        }
                    }
                } catch (e) {}
            })
            if (elem.childs) domBuilder(elem.childs, domElement);
        }
    }

    function domBuilder (domObject, positionInDom, childsPosition) {
        domObject = domIdAssign(domObject);
        var domElement = null;
        if (positionInDom) positionInDom.innerHTML = "";
        try {
            domObject.map(function(elem, key) {
                if (childsPosition !== undefined && childsPosition !== false) {
                    if (childsPosition === key) {
                        domElement = document.createElement(elem.tag || "div");
                        positionInDom.replaceChild(domElement, positionInDom.childNodes[key]);
                        singleBuilder (elem, domElement);
                    }
                } else {
                    if (!document.getElementById(elem.id)) {
                        domElement = document.createElement(elem.tag || "div");
                        positionInDom.appendChild(domElement);
                    }
                    singleBuilder (elem, domElement);
                }
            })
        } catch (e) {
            singleBuilder (domObject, domObject.element);
        }
    }
    
    function randomID() {
        const cases = "@-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var id = "";
        for (var n=0; n<10; n++) id+=cases[Math.floor(Math.random()*cases.length)];
        return id;
    }
    
    function domEvaluateString(str, domObject) {
        const regExp = /{{(.*?)}}/g;
        var matches = regExp.exec(str);
        if (matches) {
            if (str.indexOf("SELF")!==-1) {
                str = str.replace(/SELF/g, "find('"+domObject.id+"')");
            }
            if (str.indexOf("PARENT")!==-1) {
                str = str.replace(/PARENT/g, "find('"+domObject.id+"').parent");
            }
        }
        try {
            str = str.replace(/{{/g,"").replace(/}}/g,"");
            if (matches) str = eval(str);
        } catch (e) {}
        return str;
    }

    function find (id) {
        var found = false
        function recursive(id, obj, index, parent) {
            const jg = obj ? obj : dom;
            var parent = parent ? parent : null;
            if (typeof jg === "object" && jg.length > 0) {
                jg.map(function(e,k){
                    if (e.id === id) {
                        try {
                            e.top = e.element.offsetTop;
                            e.left = e.element.offsetLeft;
                            e.width = Number(
                                "width" in e
                                    ? e.width
                                    : e.element.offsetWidth
                                );
                            e.height = Number(
                                "height" in e
                                    ? e.height
                                    : e.element.offsetHeight
                                );
                            if (parent) {
                                parent.width = Number(
                                    "width" in parent
                                        ? parent.width
                                        : parent.element.offsetWidth
                                    );
                                parent.height = Number(
                                    "height" in parent
                                        ? parent.height
                                        : parent.element.offsetHeight
                                    );
                            }
                        } catch (e) {}
                        e.parent = parent;
                        found = e;
                    } else if ("childs" in e) {
                        recursive(id, e.childs, index, e)
                    } else {
                        return false
                    }
                })
            }
        }
        recursive(id);
        return found
    }
    
    function stringifyStyle(style, domObject, domElement) {
        if (typeof style === "string") return domEvaluateString(style, domObject);
        try {
            var styleArray = [];
            Object.keys(style).map(function(item){
                const match = item.match(/([A-Z])/g);
                var itemTmp = item;
                if (match) match.map(function(m){
                    item = item.replace(m,"-"+m.toLowerCase());
                })
                if (typeof style[itemTmp] === "number" && itemTmp !== "flex") {
                    style[itemTmp] = style[itemTmp]+"px";
                }
                if (typeof style[itemTmp] === "string") 
                    style[itemTmp] = typeof domEvaluateString(style[itemTmp], domObject) === 'number' 
                        ? domEvaluateString(style[itemTmp], domObject)+"px"
                        : domEvaluateString(style[itemTmp], domObject);

                if (typeof style[itemTmp] === "object") {
                    const props = style[itemTmp];
                    const delay = props.delay || 0;
                    const duration = props.duration || 1000;
                    const rangeLength = props.range.length-1;
                    const timeout = (duration/rangeLength)/10;
                    const type = props.type || (itemTmp !== "opacity") ? "px" : "";
                    var loops = 0;
                    looping()
                    function looping() {
                        var c = 0;
                        try {
                            var startValue = domEvaluateString(props.range[c], domObject);
                            var stopValue = domEvaluateString(props.range[c+1], domObject);
                            var delta = (stopValue-startValue)>1 ? 1 : -1;
                            var intervalCounter = 0;
                            var increment = Number((Math.abs(stopValue-startValue)/(timeout)).toFixed(2));
                            domElement.style[item] = Number(startValue.toFixed(2))+type;
                            setTimeout(function(){
                                var mainInterval = setInterval(function(){
                                    domElement.style[item] = Number(startValue.toFixed(2))+type;
                                    startValue+=(increment*(itemTmp !== "opacity" ? delta : 1));
                                    intervalCounter++
                                    if (intervalCounter>=timeout) {
                                        intervalCounter=0;
                                        c++;
                                        if (c>=rangeLength) {
                                            clearInterval(mainInterval)
                                            domElement.style[item] = Number(stopValue.toFixed(2))+type;
                                            loops++;
                                            if (typeof props.loop === "boolean" && props.loop) looping();
                                            if (typeof props.loop === "number" && props.loop>loops) looping();
                                        };
                                        startValue = domEvaluateString(props.range[c], domObject);
                                        stopValue = domEvaluateString(props.range[c+1], domObject);
                                        delta = (stopValue-startValue)>1 ? 1 : -1;
                                        increment = Number((Math.abs(stopValue-startValue)/timeout).toFixed(2));
                                    }
                                },1)
                            },delay)
                        } catch (e) {
                            console.error("Flash::", e);
                        }
                    }
                }
                styleArray.push(item+":"+style[itemTmp]);
            })
            return styleArray.join(";")
        } catch (e) {}
        return null;
    }

    function excludeTagsFromBuilding(item) {
        const attrList = [
            "tag",
            "childs",
            "html",
            "element",
            "hover",
            "focus",
            "active",
            "visited"
        ];
        if (attrList.indexOf(item)!==-1) 
            return false;
        return true
    }

    function necessaryTagsCheck (element) {
        const refs = Object.keys(element);
        var tagsList = [];
        var check = true;
        tagsList.map(function(tag){
            if (refs.indexOf(tag)===-1) {
                check = false;
                console.error("Flash::", tag+" element is necessary");
            }
        })
        if (!check) {
            console.info("Flash:: info");
            console.info("Necessary Tags: "+tagsList);
        }
        return check;
    }
}

const __c = FlashConcat = function () {
    const len = arguments.length;
    var ret = {};
    for (var i=0; i<len; i++) {
      for (p in arguments[i]) {
        try {
            if (arguments[i].hasOwnProperty(p)) {
              ret[p] = arguments[i][p];
            }
        } catch (e) {
            console.error("Flash::", "check your arguments in FlashConcat. They must be objects.");
        }
      }
    }
    return ret;
}

const __p = FlashPrettify = function () {
    document.body.style.boxSizing = "border-box";
    document.body.style.padding = "0px";
    document.body.style.margin = "0px";
}

const __t = FlashTransform = function (htmlQueryReference, movementsObject, duration, callback) {
    const elements = document.querySelectorAll(htmlQueryReference);
    Array.prototype.slice.call(elements).map(function(elem) {
        const i = setInterval(frame, 1);
        var incrementation = 0;
        elem.style.transform = settingMovement (incrementation);
        function frame() {
            if (incrementation == 1) {
                clearInterval(i);
            } else {
                incrementation+= duration ? (6/duration) : 0.1;
                if (incrementation > 1) {
                    incrementation = 1;
                    if (callback) setTimeout(function(){callback()},50);
                }
            }
            elem.style.transform = settingMovement (incrementation);
        }
    })
    
    function settingMovement (inc) {
        var transformation = [];
        Object.keys(movementsObject).map(function(mov){
            var type = "";
            if (mov.indexOf("translate")!==-1) type = "px";
            if (mov.indexOf("rotate")!==-1) type = "deg";
            transformation.push(
                mov+"("+(movementsObject[mov][0]+((movementsObject[mov][1]-movementsObject[mov][0])*inc))+type+")"
            );
        })
        return transformation.join(" ");
    }
}

const __i = FlashInclude = function(filePath) {
    if (window.location.protocol !== "file:") {
        filePath = filePath.indexOf(".js") !== -1 ? filePath : filePath+".js";
        var req = new XMLHttpRequest();
        req.open("GET", filePath, false); // 'false': synchronous.
        req.send(null);
        var headElement = document.getElementsByTagName("head")[0];
        var newScriptElement = document.createElement("script");
        newScriptElement.type = "text/javascript";
        newScriptElement.text = req.responseText;
        headElement.appendChild(newScriptElement);
    } else {
        console.error("Flash::", "you cannot use FlashModule outside server");
        return false;
    } 
};

const __m = FlashModule = function(filePath) {
    if (window.location.protocol !== "file:") {
        filePath = filePath.indexOf(".json") !== -1 ? filePath : filePath+".json";
        // Load json file;
        function FlashloadTextFileAjaxSync(filePath, mimeType) {
            var xmlhttp=new XMLHttpRequest();
            xmlhttp.open("GET",filePath+'?updated='+(new Date().getTime()),false);
            if (mimeType != null) {
                if (xmlhttp.overrideMimeType) {
                    xmlhttp.overrideMimeType(mimeType);
                }
            }
            xmlhttp.send();
            if (xmlhttp.status==200) {
                return xmlhttp.responseText;
            }
            else {
                // TODO Throw exception
                return null;
            }
        }
        var json = FlashloadTextFileAjaxSync(filePath, "application/json");
        // Parse json
        return JSON.parse(json);
    } else {
        console.error("Flash::", "you cannot use FlashModule outside server");
        return false;
    } 
};

var FlashParseStyle = function (style) {
    if (typeof style === "string") {
        var s = style.split(";");
        var r = {};
        s.map(function(e){
            const prop = e
                .split(":")[0]
                .split("-")
                .map(function(a,k){
                    if (k>0) 
                        return a.charAt(0).toUpperCase()+a.substr(1)
                    else
                        return a
                })
                .join("");
            const value = e
                .split(":")[1]
            r[prop] = value
        })
        return r;
    } else {
        return style;
    }
}

var FlashStyle = function (css) {
    setTimeout(function(){
        css = FlashParseStyle(css);
        let style = "";
        function recursive (obj) {
            obj = obj ? obj : css;
            try {
                Object.keys(obj).map(function(item, k){
                    let val = JSON.stringify(obj[item]).replace(/\"/g,"");
                    const match = val.match(/([A-Z])/g);
                    if (match) match.map(function(m){
                        val = val.replace(m,"-"+m.toLowerCase());
                    })
                    style += item+": "+val;
                })
            } catch (e) {
                console.log(e);
            }
        }
        recursive();
    
        if (css) {
            head = document.head || document.getElementsByTagName('head')[0],
            styleTag = document.createElement('style');
            styleTag.type = 'text/css';
            if (styleTag.styleSheet){
                // This is required for IE8 and below.
                styleTag.styleSheet.cssText = JSON.stringify(style);
            } else {
                styleTag.appendChild(document.createTextNode(style));
            }
            head.appendChild(styleTag);
        }
    },50)
}

Array.prototype.findBy = function (property, value) {
    let found = []
    let findDeep = function(data, property) {
        return data.some(function(e, k, j) {
            if(e[property] == value) {
                found.push(e);
                //return true;
            } else if (e.childs) {
                return findDeep(e.childs, property)
            }
        })
    }
    findDeep(this, property)
    return found.length > 0 ? found : false;
}

Array.prototype.find = function (id) {
    let found = false
    let findDeep = function(data, id) {
        return data.some(function(e, k, j) {
            if(e.id == id) {
                found = e
                return true;
            } else if (e.childs) {
                return findDeep(e.childs, id)
            }
        })
    }
    findDeep(this, id)
    return found;
}

Array.prototype.query = function (query) {
    let found = []
    const self = this;
    let all = document.querySelectorAll(query);
    [].map.call(all, (e)=>{
        found.push(self.find(e.id));
    })
    return found.length ? found : false;
}

Promise.prototype.init = function (settings) {
    try {
        document.title = settings.title || null;
        settings.style = settings.style ? settings.style : {};
        let doc = window.flashDocChoosed;
        Object.keys(settings.style).map(function(prop){
            doc.style[prop] = settings.style[prop]
        })
    } catch (e) {

    }
}

Promise.prototype.prettify = function () {
    FlashPrettify()
}

window.onresize = function(){
    SCREEN = FlashDetectScreenSize ();
}
