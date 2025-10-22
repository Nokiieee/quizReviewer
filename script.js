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

// function insert() {
//     const inputValue = input.value;
//     console.log(inputValue);

//     let currentItem = JSON.parse(localStorage.getItem('items'));
    
//     if (currentItem != null){
//         currentItem = [currentItem, inputValue]
//     } else {
//         currentItem = inputValue;
//     }

//     localStorage.setItem('items', JSON.stringify(currentItem));

//     console.log(currentItem);
// }

reset.addEventListener('click', function(){
    console.log(localStorage.getItem('items'));
    let reset = localStorage.removeItem('items');
});

function insert() {
    const inputValue = input.value.trim(); // Remove spaces from input

    if (!inputValue) {
        console.log("Input is empty.");
        return;
    }

    currentItem = JSON.parse(localStorage.getItem('items'));

    // If currentItem is not an array, initialize it as an empty one
    if (!Array.isArray(currentItem)) {
        currentItem = [];
    }

    currentItem.push(inputValue); // 👈 Add the new value to the end

    localStorage.setItem('items', JSON.stringify(currentItem));

    console.log(currentItem);

    input.value = ""; // Optionally clear input field
}
