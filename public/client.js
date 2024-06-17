let ifget = true;
let mediaRecorder;
function setCookie(cookieName, cookieValue, expirationDays) {
    var d = new Date();
    d.setTime(d.getTime() + (expirationDays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cookieName + "=" + cookieValue + ";" + expires + ";path=/";
}
function getCookie(cookieName) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${cookieName}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}
function handleClick(event) {
    document.querySelector('#messageInput').value += event.innerText;
}
var ws = new WebSocket('wss://myship-7-11.onrender.com');
ws.onopen = function (event) {
    ws.send(JSON.stringify({ type: "clientlogin", userId: getCookie("userId") }));
}
ws.onmessage = function (event) {
    var data = JSON.parse(event.data.toString());
    if (data.type == "updateuserId") {
        if (data.success) {
            setCookie("userId", data.userId, 1);
        } else {
            alert(data.message);
        }
    } else if (data.type == "updatefile") {
        if (data.success) {
            const chatBody = document.getElementById('chat-body');
            const fileMessage = document.createElement('div');
            const fileText = document.createElement('div');
            const userDiv = document.createElement('div');
            const userImg = document.createElement('img');
            fileText.innerText = `File: ${data.filename}`;
            fileText.style.cursor = 'pointer';
            fileText.addEventListener('click', function () {
                window.open(data.url);
            });
            if (data.sender == 0) {
                fileMessage.classList.add('message-right');
                fileText.classList.add('message-text-right');
                userDiv.className = 'user';
                userImg.src = 'index_files/avatar-red2.png';
                userImg.alt = '使用者';
                fileMessage.appendChild(fileText);
                userDiv.appendChild(userImg);
                fileMessage.appendChild(userDiv);
                chatBody.appendChild(fileMessage);
            } else if (data.sender == 1) {
                fileMessage.classList.add('message');
                fileText.classList.add('message-text');
                userDiv.className = 'avatar';
                userImg.src = 'index_files/avatar-admin2.png';
                userImg.alt = '客服';
                userDiv.appendChild(userImg);
                fileMessage.appendChild(userDiv);
                fileMessage.appendChild(fileText);
                chatBody.appendChild(fileMessage);
            }
        } else {
            alert(data.message);
        }
    } else if (data.type == "updatetext") {
        if (data.success) {
            const chatbody = document.getElementById('chat-body');
            var messageDiv = document.createElement('div');
            var newmsg = document.createElement('div');
            let regex = /\[(\d{1,2})\]/g;
            let result = data.text.replace(regex, function (match, capturedNumber) {
                let number = parseInt(capturedNumber, 10);
                if (number >= 0 && number <= 59) {
                    return `<img src="index_files/1f${number}.png">`;
                } else {
                    return match;
                }
            });
            newmsg.innerHTML = result;
            var userDiv = document.createElement('div');
            var userImg = document.createElement('img');
            if (data.sender == 0) {
                userDiv.className = 'user';
                userImg.src = 'index_files/avatar-red2.png';
                userImg.alt = '使用者';
                messageDiv.className = 'message-right';
                newmsg.className = 'message-text-right';
                messageDiv.appendChild(newmsg);
                userDiv.appendChild(userImg);
                chatbody.appendChild(messageDiv);
                messageDiv.appendChild(userDiv);
                document.querySelector('#messageInput').value = "";
            } else if (data.sender == 1) {
                userDiv.className = 'avatar';
                userImg.src = 'index_files/avatar-admin2.png';
                userImg.alt = '客服';
                messageDiv.className = 'message';
                newmsg.className = 'message-text';
                userDiv.appendChild(userImg);
                messageDiv.appendChild(userDiv);
                messageDiv.appendChild(newmsg);
                chatbody.appendChild(messageDiv);
            }
        } else {
            alert(data.message);
        }
    } else if (data.type == "updateimg") {
        if (data.success) {
            const chatbody = document.getElementById('chat-body');
            var messageDiv = document.createElement('div');
            var newimg = document.createElement('img');
            newimg.src = data.url;

            newimg.onclick = expandImage;
            var userDiv = document.createElement('div');
            var userImg = document.createElement('img');
            if (data.sender == 0) {
                newimg.classList.add('chat-img-right');
                messageDiv.className = 'message-right';
                userDiv.className = 'user';
                userImg.src = 'index_files/avatar-red2.png';
                userImg.alt = '使用者';
                messageDiv.appendChild(newimg);
                userDiv.appendChild(userImg);
                chatbody.appendChild(messageDiv);
                messageDiv.appendChild(userDiv);
            } else if (data.sender == 1) {
                newimg.classList.add('chat-img');
                messageDiv.className = 'message';
                userDiv.className = 'avatar';
                userImg.src = 'index_files/avatar-admin2.png';
                userImg.alt = '使用者';
                messageDiv.appendChild(userDiv);
                userDiv.appendChild(userImg);
                messageDiv.appendChild(newimg);
                chatbody.appendChild(messageDiv);
            }
        } else {
            alert(data.message);
        }
    } else if (data.type == "updaterecord") {
        if (data.success) {
            const chatbody = document.getElementById('chat-body');
            var messageDiv = document.createElement('div');
            var newrecord = document.createElement('audio');
            var source = document.createElement('source');
            source.src = data.url;
            source.type = "audio/mp3";
            newrecord.appendChild(source);
            newrecord.setAttribute('controls', '');
            var userDiv = document.createElement('div');
            var userImg = document.createElement('img');
            if (data.sender == 0) {
                newrecord.classList.add('message-text-right');
                messageDiv.className = 'message-right';
                userDiv.className = 'user';
                userImg.src = 'index_files/avatar-red2.png';
                userImg.alt = '使用者';
                messageDiv.appendChild(newrecord);
                userDiv.appendChild(userImg);
                chatbody.appendChild(messageDiv);
                messageDiv.appendChild(userDiv);
            } else if (data.sender == 1) {
                newrecord.classList.add('message-text');
                messageDiv.className = 'message';
                userDiv.className = 'avatar';
                userImg.src = 'index_files/avatar-admin2.png';
                userImg.alt = '使用者';
                messageDiv.appendChild(userDiv);
                userDiv.appendChild(userImg);
                messageDiv.appendChild(newrecord);
                chatbody.appendChild(messageDiv);
            }
        } else {
            alert(data.message);
        }
    } else if (data.type == "update") {
        if (data.op == "刪除" && data.client.id == getCookie("userId")) {
            location.reload();
        }
    } else if (data.type.includes(".html")) {
        alert(data.message);
        window.location.href = data.type;
    }
};
//選擇表情
document.getElementById('emojiButton').addEventListener('click', function () {
    const emojiButton = document.getElementById('emojiButton');
    const emojiList = document.getElementById('emojiList');
    const rect = emojiButton.getBoundingClientRect();

    emojiList.style.left = `${rect.left}px`;
    emojiList.style.top = `${rect.top - 300}px`;

    if (emojiList.classList.contains("hidden")) {
        emojiList.classList.remove("hidden");
    } else {
        emojiList.classList.add("hidden");
    }
});

const emojiContainer = document.getElementById('emojiList');
for (var i = 0; i <= 59; i++) {
    const img = document.createElement('img');
    img.src = `index_files/1f${i}.png`;
    img.alt = i;
    img.setAttribute('data-emoji', i);
    emojiContainer.appendChild(img);
    img.addEventListener('click', function () {
        const selectedEmoji = document.getElementById('selectedEmoji');
        document.querySelector('#messageInput')
        const inputField = document.querySelector('#messageInput');
        const emojiCode = `[${this.getAttribute('data-emoji')}]`;
        const cursorPos = inputField.selectionStart;
        const textBeforeCursor = inputField.value.substring(0, cursorPos);
        const textAfterCursor = inputField.value.substring(cursorPos, inputField.value.length);
        inputField.value = textBeforeCursor + emojiCode + textAfterCursor;
        inputField.focus();
        emojiList.classList.add("hidden");
    });
}
document.addEventListener('click', function (event) {
    const emojiButton = document.getElementById('emojiButton');
    const emojiList = document.getElementById('emojiList');
    if (!emojiButton.contains(event.target) && !emojiList.contains(event.target)) {
        emojiList.classList.add("hidden");
    }
});
/*傳送檔案*/
const fileButton = document.getElementById('file-button');
const fileInput = document.getElementById('fileInput');
fileButton.addEventListener('click', function () {
    fileInput.click();
});

fileInput.addEventListener('change', function () {
    if (getCookie("userId")) {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                const fileContent = event.target.result;
                ws.send(JSON.stringify({ type: 'sendfile', filename: file.name, filecontent: fileContent, sender: 0, id: getCookie("userId") }));
            };
            reader.readAsDataURL(file);
        }
    }
});
const imgButton = document.getElementById('image-button');
const imgInput = document.getElementById('imgInput');
imgButton.addEventListener('click', function () {
    imgInput.click();
});

imgInput.addEventListener('change', function () {
    if (getCookie("userId")) {
        const file = imgInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                const img = document.createElement('img');
                img.src = event.target.result;
                ws.send(JSON.stringify({ type: 'sendimg', img: img.src, sender: 0, id: getCookie("userId") }));
            };
            reader.readAsDataURL(file);
        }
    }
});
/*傳送文字*/
document.querySelector('#send-text')?.addEventListener('click', (e) => {
    const sendText = document.getElementById('send-text');
    if (sendText.innerHTML == "發送" && getCookie("userId")) {
        const msg = document.querySelector('#messageInput');
        if (msg.value != "")
            ws.send(JSON.stringify({ type: 'sendtext', text: msg?.value, sender: 0, id: getCookie("userId") }));
        msg.value = "";
    }
});
document.addEventListener('keydown', function (event) {
    if (event.key === "Enter" && getCookie("userId")) {
        const msg = document.querySelector('#messageInput');
        if (msg.value != "")
            ws.send(JSON.stringify({ type: 'sendtext', text: msg?.value, sender: 0, id: getCookie("userId") }));
        msg.value = "";
    }
});
/*圖片放大*/
var imageDialog = document.getElementById('imageDialog');
var expandedImg = document.getElementById('expandedImg');
function expandImage() {
    var clickedImg = event.target;
    expandedImg.src = clickedImg.src;
    imageDialog.style.display = 'block';
}
window.onclick = function (event) {
    if (event.target == imageDialog) {
        imageDialog.style.display = 'none';
    }
}
document.getElementsByClassName('close')[0].onclick = function () {
    imageDialog.style.display = 'none';
}
/*切換語音或發送文字*/
document.addEventListener('DOMContentLoaded', function () {
    const sendIcon = document.getElementById('send-icon');
    sendIcon.addEventListener('click', function () {
        const circle = document.getElementById('circle');
        const voiceSelect = document.getElementById('voice-select');
        if (voiceSelect.style.display === 'none') {
            if (!circle.classList.contains("record")) {
                voiceSelect.style.display = 'block';
            }
        } else {
            voiceSelect.style.display = 'none';
        }
    });
    const voiceToggle = document.getElementById('voice-toggle');
    voiceToggle.addEventListener('click', function () {
        const circle = document.getElementById('circle');
        const voiceSelect = document.getElementById('voice-select');
        const messageInput = document.getElementById('messageInput');
        const circlebg = document.getElementById('circle-bg');
        const voiceToggle = document.getElementById('voice-toggle');
        const sendText = document.getElementById('send-text');
        if (!circle.classList.contains("record")) {
            if (voiceToggle.innerText === '切換成語音') {
                if (ifget) {
                    ifget = false;
                    navigator.mediaDevices.getUserMedia({ audio: true })
                        .then(function (stream) {
                            mediaRecorder = new MediaRecorder(stream);
                            let chunks = [];

                            mediaRecorder.ondataavailable = function (e) {
                                chunks.push(e.data);
                            }

                            mediaRecorder.onstop = function () {
                                let blob = new Blob(chunks, { 'type': 'audio/ogg; codecs=opus' });
                                let fileReader = new FileReader();
                                fileReader.onload = function () {
                                    let arrayBuffer = this.result;
                                    let base64Data = arrayBufferToBase64(arrayBuffer);
                                    let message = {
                                        type: 'sendrecord',
                                        record: base64Data,
                                        sender: 0,
                                        id: getCookie("userId")
                                    };
                                    if (getCookie("userId"))
                                        ws.send(JSON.stringify(message));
                                };

                                fileReader.readAsArrayBuffer(blob);
                            }

                        })
                        .catch(function (err) {
                            alert("請打開錄音權限");
                            ifget = true;
                            voiceToggle.innerText = '切換成語音';
                            sendText.innerText = '發送';
                            circlebg.classList.add("hidden");
                            messageInput.classList.remove("hidden");
                        });
                }
                voiceToggle.innerText = '切換成發送訊息';
                sendText.innerText = '語音';
                circlebg.classList.remove("hidden");
                messageInput.classList.add("hidden");
            } else {
                voiceToggle.innerText = '切換成語音';
                sendText.innerText = '發送';
                circlebg.classList.add("hidden");
                messageInput.classList.remove("hidden");
            }
            voiceSelect.style.display = 'none';
        }
    });

    document.addEventListener('click', function (event) {
        const voiceSelect = document.getElementById('voice-select');
        const sendIcon = document.getElementById('send-icon');
        if (!sendIcon.contains(event.target)) {
            voiceSelect.style.display = 'none';
        }
    });
    const screenshotbutton = document.getElementById('screenshot-button');
    screenshotbutton.addEventListener('click', function () {
        const screenshothint = document.getElementById('screenshot-hint');
        if (screenshothint.style.display === 'none') {
            screenshothint.style.display = 'block';
        } else {
            screenshothint.style.display = 'none';
        }
    });
    document.addEventListener('click', function (event) {
        const screenshotbutton = document.getElementById('screenshot-button');
        if (!screenshotbutton.contains(event.target)) {
            const screenshothint = document.getElementById('screenshot-hint');
            screenshothint.style.display = 'none';
        }
    });
    const circle = document.getElementById('circle');
    circle.addEventListener("click", function () {
        if (circle.classList.contains("record")) {
            mediaRecorder.stop();
            circle.classList.remove("record");
        } else {
            mediaRecorder.start();
            circle.classList.add("record");
        }
    });
});

function arrayBufferToBase64(buffer) {
    let binary = '';
    let bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}
/*貼上截圖*/
document.addEventListener('DOMContentLoaded', function () {
    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('paste', function (event) {
        const items = (event.clipboardData || window.clipboardData).items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = function (event) {
                    const img = document.createElement('img');
                    img.src = event.target.result;
                    if (getCookie("userId"))
                        ws.send(JSON.stringify({ type: 'sendimg', img: img.src, sender: 0, id: getCookie("userId") }));
                };
                reader.readAsDataURL(blob);
            }
        }
    });
});