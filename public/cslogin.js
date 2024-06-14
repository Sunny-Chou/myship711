const ws = new WebSocket('ws://myship7-11.myvnc.com');

document.getElementById('login-form').addEventListener('submit', function (event) {
    event.preventDefault();

    const userId = document.getElementById('userId').value;
    const password = document.getElementById('password').value;
    ws.send(JSON.stringify({ type: "sevicerlogin", userId: userId, password: password }));
});
ws.onmessage = function (event) {
    const data = JSON.parse(event.data);
    if (data.type == "sevicerlogin") {
        if (data.success) {
            sessionStorage.setItem('userId', data.userId);
            window.location.href = 'transfer.html';
        } else {
            alert(data.message);
        }
    } else if (data.type.includes(".html")) {
        if (!data.success) {
            alert(data.message);
            window.location.href = data.type;
        }
    }
};
