const submit = document.getElementById('submit-button');
const reset = document.getElementById('reset-button');
const input = document.getElementById('input');
const start = document.getElementById('start');
const reviewer = document.getElementById('reviewer');

let currentItem = JSON.parse(localStorage.getItem('items'));

start.addEventListener('click', function(){
    // Generate a random number between 1 and reviewerNumber
    if (currentItem.length != 0){
        let randomReviewer = Math.floor(Math.random() * currentItem.length) + 1;
        
        console.log(currentItem);

        const theText = currentItem[randomReviewer - 1];

        currentItem.splice(randomReviewer - 1, 1);

        reviewer.innerHTML = theText;
    } else {
        reviewer.innerHTML = "finished!";
    }
}); 
    
submit.addEventListener('click', insert);

reset.addEventListener('click', function(){
    console.log(localStorage.getItem('items'));
    localStorage.removeItem('items');
});

function insert() {
    const inputValue = input.value.trim(); // Remove spaces from input

    if (!inputValue) {
        console.log("Input is empty.");
        return;
    }

    currentItem = JSON.parse(localStorage.getItem('items'));

    console.log(currentItem);

    const split = inputValue.split('|');

    localStorage.setItem('items', JSON.stringify(split));

    console.log(currentItem);

    input.value = ""; // Optionally clear input field
}
