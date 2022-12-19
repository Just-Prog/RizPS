/*
如果你把ssl证书弄丢了，在拥有openssl可执行文件的前提下可以使用下面的命令重新生成一个：
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr
openssl x509 -req -days 114514 -in server.csr -signkey server.key -out server.crt
*/

const https = require("https");
const express = require('express');
const fs = require('fs');
const app = express();
const request = require("request")
//导入库

const express_options = {
    setHeaders(res, path, stat) {
        res.set('Content-Type', "application/json")
        res.set('Access-Control-Allow-Origin', "*")
    }
}//设置headers

app.use(express.static('public', express_options))
//让express应用上方的options

//config配置
const host = "0.0.0.0"//对外ip 当然首选0.0.0.0
const port = 443;//对外端口号
const first_play = false //是否第一次打开游戏，详见README说明，此变量将会控制guestLogin.do的返回值，若返回值不正确将导致游戏本地数据出错，有可能需重装解决
const loglevel = 0//0表示显示全log，1表示精简显示log
const options = {
    key: fs.readFileSync('./cert/server.key'),
    cert: fs.readFileSync('./cert/server.crt')
};//设置证书文件
const serverinfo = {
    platform: "Cross Platform",
    arch: "ALL",
    version: "RizPS 1.2 For Rizline 1.0.2",
    git_online_repo: "https://github.com/Searchstars/RizPS",
    type: "Source Code"
}
//设置服务器信息，如果要制作一键包的话，这很有用（平时也很有用不是吗(*/ω＼*) ）

console.log("Welcome to RizPS\n" + serverinfo.version + "\narch: " + serverinfo.arch + "  platform: " + serverinfo.platform + "  type: " + serverinfo.type)
console.log("RizPS是永久免费且开源的服务器软件，遵循GPL-3.0协议，这意味着您若要发布经过您修改的RizPS或使用了RizPS代码的软件，则必须同时开源。若您是在别处通过购买得到了RizPS，那么这意味着你已经被骗了。\n")
//输出一些信息，倒卖狗死妈

const server = https.createServer(options, app);
server.listen(port, host, () => {
    console.log(`服务器启动成功，你可以通过以下地址访问: https://${host}:${port}`);
});
//开始监听端口

function randomString(e) {
    e = e || 32;
    var t = "abcdefhijkmnprstwxyz12345678",
        a = t.length,
        n = "";
    for (i = 0; i < e; i++) n += t.charAt(Math.floor(Math.random() * a));
    return n
}//随机字符串函数，可用于生成token，当然用不到

app.all('/', (req, res) => {
    console.log("客户端向 / 发送 GET 请求")
    res.send("欢迎来到 RizPS！")
}
);//请求根目录时的返回，用于确认与RizPS的连接是否正确，以及模拟百度和谷歌

app.connect("*", (req, res) => {
    res.statusCode = 200
    res.send("{\"code\":\"0\"}")
})//当对任何域名发起CONNECT时都返回200状态码带上code0，特指graph.facebook.com

app.all('/sync_data', (req, res) => {
    let req_datas = ""
    req.on('data', function (chunk) {
        req_datas += chunk;
    });
    req.on('end', function () {
        req_datas = decodeURIComponent(req_datas)
        if (loglevel == 0) {
            console.log("客户端向 /sync_data 发送 POST 请求 内容为：\n" + "-----------\n" + req_datas.toString() + "\n----------")
        }
        res.send("{\"code\":0}")
    })
}
);//同步数据的请求处理，输出数据可用于检测客户端状态，虽然我认为帮助不大（不然为什么loglevel1不输出呢）

const static_inhans = fs.readFileSync("./static_contents/initget_zhans.txt").toString()
const static_inhk = fs.readFileSync("./static_contents/initget_zhk.txt").toString()

app.all('/elva/api/v2.0/initget', (req, res) => {
    console.log("客户端向 /elva/api/v2.0/initget 发送 GET 请求")
    if (req.url.search("zh-Hans-CN") != -1) {
        res.send("{\"flag\":true,\"code\":200,\"message\":\"Success\",\"time\":" + Date.now() + "," + static_inhans)
    }
    else if (req.url.search("zh-HK") != -1) {
        res.send("{\"flag\":true,\"code\":200,\"message\":\"Success\",\"time\":" + Date.now() + "," + static_inhk)
    }
    else {
        res.send("无法解析的请求")
    }
}
);//initget的请求处理，分zh_hans和zh_hk两个版本，通过查找url中是否有匹配字符串的方法来解决

app.post("/login/sdkCheckLogin.do", (req, res) => {
    let req_datas = ""
    req.on('data', function (chunk) {
        req_datas += chunk;
    });
    req.on('end', function () {
        req_datas = req_datas.split("&")
        console.log("客户端正在尝试使用SDK登陆，发送的信息为：")
        console.log(req_datas)
        let resend = ""
        if (req.headers["user-agent"].search("Darwin") != -1) {
            resend = "{\"message\":\"username or password error\",\"status\":\"10001\"}"
        }
        else {
            resend = "{\"message\":\"{\\\"timestamp\\\":\\\"" + Date.now() + "\\\",\\\"warnEndDate\\\":null,\\\"token\\\":\\\"" + req_datas[16].split("=")[1] + "\\\",\\\"priority\\\":0,\\\"cmtBirth\\\":\\\"0\\\",\\\"bind\\\":\\\"\\\"}\",\"status\":\"1\"}"
        }
        console.log(req.headers["user-agent"])
        console.log(resend)
        res.send(resend)
    });
})//SDK登陆的请求处理，如果是苹果，直接给它返回用户名或密码错误，然后使其使用游客登陆。非苹果设备正常返回

app.all("/login/guestLogin.do", (req, res) => {
    let req_datas = ""
    req.on('data', function (chunk) {
        req_datas += chunk;
    });
    req.on('end', function () {
        let beforce_req_datas = req_datas
        console.log("客户端正在尝试游客登陆（可能是初次尝试注册账号？），发送的信息为：")
        console.log(req_datas)
        let resend = ""
        if (first_play != true) {
            resend = "{\"message\":\"{\\\"timestamp\\\":\\\"1671263645898\\\",\\\"sid\\\":\\\"xkykm9p6\\\",\\\"warnEndDate\\\":null,\\\"token\\\":\\\"6ac0e471929872e866edbf8ef4aeb8f7\\\",\\\"cmtBirth\\\":\\\"0\\\",\\\"bind\\\":\\\"3\\\"}\",\"status\":\"1\"}"
        }
        else {
            resend = "{\"message\":\"{\\\"timestamp\\\":\\\"" + Date.now() + "\\\",\\\"userpwd\\\":\\\"e5d566420a1a489f3198df1fbc50b916\\\",\\\"sid\\\":\\\"myglp5t0\\\",\\\"username\\\":\\\"yj5ekog5\\\",\\\"token\\\":\\\"f97f703b4c8d2138c6e1e678b1bc1698\\\",\\\"cmtBirth\\\":0,\\\"bind\\\":\\\"\\\"}\",\"status\":\"1\"}"
        }
        //let resend = "{\"message\":\"{\\\"timestamp\\\":\\\"" + Date.now() + "\\\",\\\"userpwd\\\":\\\"FuckYouLTGames\\\",\\\"sid\\\":\\\"RizPSUser\\\",\\\"warnEndDate\\\":null,\\\"token\\\":\\\"157osf59ksl227n25pkocbf4a212reac\\\",\\\"priority\\\":3,\\\"cmtBirth\\\":\\\"3\\\",\\\"bind\\\":\\\"9\\\"}\",\"status\":\"1\"}"
        console.log(resend)
        res.send(resend)
    });
})//游客登陆请求处理，如果是初次游玩，则需要额外给予玩家userpwd和sid还有username，正常游玩只需给予sid就够了

app.all("/SDKLogin", (req, res) => {
    let req_datas = ""
    req.on('data', function (chunk) {
        req_datas += chunk;
    });
    req.on('end', function () {
        res.send(fs.readFileSync("./static_contents/SDKLoginStr.txt"))
    })
})

app.all("/iosssconf", (req, res) => {
    res.send(fs.readFileSync("./static_contents/ios_shadowrockets_conf.conf"))
})

app.all("/test", (req, res) => {
    res.statusCode = 200
    res.send()
})

//以下是一些杂乱的请求处理，不能确保全部有用
const st_41_20190403json = fs.readFileSync("./static_contents/410001_config_20190403.json").toString()

app.all("/67/410001_config_20190403.json", (req, res) => {
    res.send(st_41_20190403json)
})

app.all("/lvdgj/version/release/410001_main.dis", (req, res) => {
    res.send(fs.readFileSync("./static_contents/410001_main_dis.json"))
})

const st_lg = fs.readFileSync("./static_contents/languageConfig.json").toString()

app.all("/language/languageConfig.json", (req, res) => {
    res.send(st_lg)
})

app.all("/testasset/iOS/catalog_catalog.hash", (req, res) => {
    res.send("3a3ea6ea53779f426accb56e1defd3da")
})

const stv11_faef = fs.readFileSync("./static_contents/facebook_app_events_feature_bitmask.json").toString()
const stv11_faec = fs.readFileSync("./static_contents/facebook_app_events_config.json").toString()
const st_fb_msdkgk = fs.readFileSync("./static_contents/facebook_mobile_sdk_gk.json").toString()

app.all("/v11.0", (req, res) => {
    let req_datas = ""
    req.on('data', function (chunk) {
        req_datas += chunk;
    });
    req.on('end', function () {
        if (req_datas.search("app_events_feature_bitmask") != -1) {
            res.send(stv11_faef)
        }
        else if (req_datas.search("app_events_config") != -1) {
            res.send(stv11_faec)
        }
        else if (req_datas.search("mobile_sdk_gk") != -1) {
            res.send(st_fb_msdkgk)
        }
    })
})

app.all("/v11.0/493960762698668", (req, res) => {
    if (req.url.search("app_events_feature_bitmask") != -1) {
        res.send(stv11_faef)
    }
    else if (req.url.search("app_events_config") != -1) {
        res.send(stv11_faec)
    }
})

app.all("/v11.0/493960762698668/mobile_sdk_gk", (req, res) => {
    res.send(st_fb_msdkgk)
})

app.all("/v11.0/493960762698668/ios_skadnetwork_conversion_config", (req, res) => {
    res.send("{\"data\":[]}")
})

app.all("/v11.0/493960762698668/aem_conversion_configs", (req, res) => {
    res.send("{\"data\":[]}")
})

app.all("/elva/api/SdkTrack/ExceptionTrack", (req, res) => {
    res.send("{\"flag\":true,\"code\":0,\"desc\":\"\",\"time\":" + Date.now() + ",\"data\":false}")
})

app.all("/api/v1.0/rules", (req, res) => {
    res.send("{\"message\":\"invalid signature\"}")
})

app.all("/log/chargeLogReport.do", (req, res) => {
    res.send("success")
})

app.all("/elva/api/initset", (req, res) => {
    console.log("客户端向 /elva/api/v2.0/initset 发送请求")
    res.send("{\"flag\":true,\"code\":0,\"desc\":\"\",\"data\":true}")
})

app.all("/testasset/iOS/catalog_catalog.json", (req, res) => {
    res.send(fs.readFileSync("./static_contents/catalog.json").toString())
})

app.all("/language/language/zh-HK.json", (req, res) => {
    res.send(fs.readFileSync("./static_contents/zhhk.json").toString())
})

app.all("/language/language/zh-TW.json", (req, res) => {
    res.send(fs.readFileSync("./static_contents/zhtw.json").toString())
})

app.all("/language/language/zh-CN.json", (req, res) => {
    res.send(fs.readFileSync("./static_contents/zh.json").toString())
})

app.all("/generate_204", (req, res) => {
    res.statusCode = 204
    res.send()
})