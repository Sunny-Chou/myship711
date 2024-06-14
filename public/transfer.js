var ws = new WebSocket('ws://myship7-11.myvnc.com');
ws.onopen = function (event) {
    ws.send(JSON.stringify({ type: "getclient", userId: sessionStorage.getItem("userId") }));
}
ws.onmessage = function (event) {
    var data = JSON.parse(event.data.toString());
    console.log('Received server event:', data);
    if (data.type == "getclient") {
        const container = document.getElementById('avatars');
        container.innerHTML = '';
        if (data.success) {
            data.clients.forEach(client => {
                const div = document.createElement('div');
                div.className = 'avatar';
                const img = document.createElement('img');
                img.src="index_files/avatar-red2.png";
                div.appendChild(img);
                const avatarContent = document.createElement('div');
                avatarContent.className = 'avatar-content';

                const div2 = document.createElement('div');
                const p1 = document.createElement('p');
                p1.innerHTML = client.id.slice(0, 3);

                avatarContent.appendChild(div2);
                avatarContent.appendChild(p1);
                div.appendChild(avatarContent);

                if (client.online) {
                    div2.classList.add("green-dot");
                } else {
                    div2.classList.add("white-dot");
                }

                const button1 = document.createElement('button');
                button1.setAttribute("onclick", `openChat("${client.id}")`);
                button1.classList.add("hidden");

                const button2 = document.createElement('button');
                button2.classList.add("hidden");
                button2.textContent = "刪除";
                button2.setAttribute("onclick", `deleteClient("${client.id}")`);

                if (client.sevicer == "") {
                    button1.textContent = "轉接客服";
                    div.appendChild(button1);
                    div.addEventListener('mouseenter', function () {
                        button1.classList.remove("hidden");
                        p1.classList.add("hidden");
                        div2.classList.add("hidden");
                        img.classList.add("hidden");
                    });
                    div.addEventListener('mouseleave', function () {
                        button1.classList.add("hidden");
                        p1.classList.remove("hidden");
                        div2.classList.remove("hidden");
                        img.classList.remove("hidden");
                    });
                } else {
                    button1.textContent = "回到客服";
                    div.appendChild(button1);
                    div.appendChild(button2);
                    div.addEventListener('mouseenter', function () {
                        button1.classList.remove("hidden");
                        button2.classList.remove("hidden");
                        p1.classList.add("hidden");
                        div2.classList.add("hidden");
                        img.classList.add("hidden");
                    });
                    div.addEventListener('mouseleave', function () {
                        button1.classList.add("hidden");
                        button2.classList.add("hidden");
                        p1.classList.remove("hidden");
                        div2.classList.remove("hidden");
                        img.classList.remove("hidden");
                    });
                }

                container.appendChild(div);

            });
        } else {
            alert(data.message);
            window.location.href = "cslogin.html";
        }
    } else if (data.type == "update") {
        ws.send(JSON.stringify({ type: "getclient", userId: sessionStorage.getItem("userId") }));
    } else if (data.type.includes(".html")) {
        if (!data.success) {
            alert(data.message);
            window.location.href = data.type;
        }
    }
};
function openChat(id) {
    window.open(`chat.html?userId=${id}`, '_blank');
}
function deleteClient(id) {
    ws.send(JSON.stringify({ type: "deleteClient", userId: sessionStorage.getItem('userId'), id: id }));
}