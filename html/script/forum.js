const urlParams = new URLSearchParams(window.location.search);
let gameid = urlParams.get("gameid");
if (!gameid) {
    gameid = 0;
}
const act = document.getElementById(`li${gameid}`);
act.classList.add("active");


document.addEventListener('DOMContentLoaded', () => {


    fetch('/get-userid', {
        method: 'GET',
        credentials: 'include' // 讓 fetch 送 cookie（session id）
    })
        .then(res => res.json())
        .then(data => {
            if (data.userId) {
                document.getElementById('playerId').textContent = data.userId;
            } else if (data.error) {
                document.getElementById('playerId').textContent = data.error;
            } else {
                document.getElementById('playerId').textContent = '找不到玩家ID';
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById('playerId').textContent = '讀取錯誤';
        });

});


const PersonalFile = document.querySelector("#toper");

PersonalFile.addEventListener('click', () => {

    window.location.href = '../personalfile';
});
const Create = document.querySelector("#ToCreatePost");

Create.addEventListener('click', () => {

    window.location.href = '../createPost';
});
// 下清單
const avatarBox = document.querySelector('.avatar-box');
const avatarDropdown = avatarBox.querySelector('.avatar-dropdown');
avatarBox.addEventListener('mouseenter', () => {
    avatarDropdown.style.display = 'block'; // 滑鼠移入時顯示下拉選單
});
// BUG
avatarBox.addEventListener('mouseleave', () => {
    avatarDropdown.style.display = 'none'; // 滑鼠移出時隱藏下拉選單
});


document.querySelectorAll('.post-card').forEach(card => {
    const postid = card.getAttribute('data-post-id');
    card.addEventListener('click', function () {
        // 假設你有加 data-post-id 屬性
        const postId = this.getAttribute('data-post-id');
        if (postId) {
            window.location.href = `/post/${postId}`;
        }
    });
    fetch(`/post/${postid}/checklike`, {
        method: 'POST',
        credentials: 'include'
    })
        .then(res => res.json())
        .then(data => {
            const likeImg = card.querySelector('.l1');
            if (data.success && data.gooded) {
                likeImg.src = '/img/gooded.png';
            } else if (data.success) {
                likeImg.src = '/img/good.png';
            } else {
                alert(data.error);
            }
        })
        .catch(err => {
            console.error('失敗：', err);
        });

});