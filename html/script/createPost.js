const form = document.querySelector('.post-content');
const resultDiv = document.getElementById('resultDiv');

form.addEventListener('submit', function(event) {
    event.preventDefault(); // 阻止表單預設送出

    const formData = new FormData(form);

    fetch('/createPost', {
        method: 'POST',
        body: formData,
    })
    .then(res => {
        return res.json();
    })
    .then(data => {

        console.log("後端回傳資料：", data);
        if (data.success) {
            // 顯示成功訊息
            resultDiv.style.display = 'block';
            // 取得按鈕並綁定事件（避免重複綁定）
            const btn = document.querySelector('#viewBtn');
            btn.onclick = () => {
                
                setTimeout(() => {
                    window.location.replace('/post/' + data.postid);
                }, 100);
            };

        } else {
            alert(data.error || "未知錯誤");
        }
    })
    .catch(err => {
        console.error('請求失敗：', err);
        alert("請求失敗：" + err.message);
    });
});