const form = document.querySelector('.post-content');
const resultDiv = document.getElementById('resultDiv');

form.addEventListener('submit', function (event) {
    event.preventDefault();
    console.log("表單提交事件綁定");
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
                resultDiv.style.display = 'block';
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