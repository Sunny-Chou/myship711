var ws = new WebSocket('wss://myship-7-11.onrender.com');
function handleMouseEnter(div, sevicer) {
    const p1 = div.querySelector('.avatar-content p');
    const div2 = div.querySelector('.avatar-content div');
    const img = div.querySelector('img');
    const button1 = div.querySelector('button:first-child');
    const button2 = div.querySelector('button:last-child');
    button1.classList.remove('hidden');
    if (sevicer !== '') button2.classList.remove('hidden');
    p1.classList.add('hidden');
    div2.classList.add('hidden');
    img.classList.add('hidden');
}

function handleMouseLeave(div, sevicer) {
    const p1 = div.querySelector('.avatar-content p');
    const div2 = div.querySelector('.avatar-content div');
    const img = div.querySelector('img');
    const button1 = div.querySelector('button:first-child');
    const button2 = div.querySelector('button:last-child');
    button1.classList.add('hidden');
    if (sevicer !== '') button2.classList.add('hidden');
    p1.classList.remove('hidden');
    div2.classList.remove('hidden');
    img.classList.remove('hidden');
}
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
                img.src = "index_files/avatar-red2.png";
                div.appendChild(img);
                const avatarContent = document.createElement('div');
                avatarContent.className = 'avatar-content';

                const div2 = document.createElement('div');
                const p1 = document.createElement('p');
                p1.innerHTML = client.id.slice(0, 3);
                div.dataset.id = client.id;
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
                } else {
                    button1.textContent = "回到客服";
                }
                div.appendChild(button1);
                div.appendChild(button2);
                div.addEventListener('mouseenter', () => handleMouseEnter(div, client.sevicer));
                div.addEventListener('mouseleave', () => handleMouseLeave(div, client.sevicer));
                container.appendChild(div);

            });
        } else {
            alert(data.message);
            window.location.href = "cslogin.html";
        }
    } else if (data.type == "update") {
        const container = document.getElementById('avatars');
        if (data.op == "新增") {
            const div = document.createElement('div');
            div.dataset.id = data.client.id;
            div.className = 'avatar';
            const img = document.createElement('img');
            img.src = "index_files/avatar-red2.png";
            div.appendChild(img);
            const avatarContent = document.createElement('div');
            avatarContent.className = 'avatar-content';
            div.appendChild(avatarContent);
            const div2 = document.createElement('div');
            avatarContent.appendChild(div2);
            const p1 = document.createElement('p');
            avatarContent.appendChild(p1);
            p1.innerHTML = data.client.id.slice(0, 3);
            div2.className = data.client.online ? 'green-dot' : 'white-dot';
            const button1 = document.createElement('button');
            button1.classList.add('hidden');
            div.appendChild(button1);
            const button2 = document.createElement('button');
            button2.classList.add('hidden');
            button2.textContent = "刪除";
            div.appendChild(button2);
            container.appendChild(div);
            if (data.client.sevicer === '') {
                button1.textContent = '轉接客服';
            } else {
                button1.textContent = '回到客服';
            }
            div.addEventListener('mouseenter', () => handleMouseEnter(div, data.client.sevicer));
            div.addEventListener('mouseleave', () => handleMouseLeave(div, data.client.sevicer));
            button1.setAttribute("onclick", `openChat("${data.client.id}")`);
            button2.setAttribute("onclick", `deleteClient("${data.client.id}")`);
        } else if (op == "更新") {
            let div = document.querySelector(`div[dataset-id='${data.client.id}']`);
            div.dataset.id = data.client.id;
            const avatarContent = div.querySelector('.avatar-content');
            const div2 = avatarContent.querySelector('div');
            const button1 = div.querySelector('button:first-child');
            const button2 = div.querySelector('button:last-child');
            div2.className = data.client.online ? 'green-dot' : 'white-dot';
            if (data.client.sevicer === '') {
                button1.textContent = '轉接客服';
            } else {
                button1.textContent = '回到客服';
            }
            div.removeEventListener('mouseenter', handleMouseEnter);
            div.removeEventListener('mouseleave', handleMouseLeave);
            div.addEventListener('mouseenter', () => handleMouseEnter(div, data.client.sevicer));
            div.addEventListener('mouseleave', () => handleMouseLeave(div, data.client.sevicer));
        } else if (op == "刪除") {
            const div = document.querySelector(`div[dataset-id='${data.client.id}']`);
            if (div) {
                container.removeChild(div);
            }
        }
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