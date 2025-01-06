

// clien-side validation (bootstrap)
// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
    'use strict'
  
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.querySelectorAll('.needs-validation')
  
    // Loop over them and prevent submission
    Array.from(forms).forEach(form => {
      form.addEventListener('submit', event => {
        if (!form.checkValidity()) {
          event.preventDefault()
          event.stopPropagation()
        }
  
        form.classList.add('was-validated')
      }, false)
    })
  })()


// slider
let slides=document.querySelectorAll(".slide");
let next=document.querySelector(".next");
let prev=document.querySelector(".prev");
let counter=0;
let slideImage=()=>{
    slides.forEach((slide)=>{
         slide.style.transform=`translateX(-${counter*100}%)`;
    });
}
next.addEventListener("click",function (event) {
     counter=counter+1===slides.length?0:counter+1;
     event.stopPropagation();
     slideImage();
  });
prev.addEventListener("click",function(event){
    counter=counter-1<0?slides.length-1:counter-1;
    event.stopPropagation();
    slideImage();
});
let autoClick=()=>{
    next.click();
}
// setInterval(autoClick,3000);

// hamberger-btn
const hBtn=document.querySelector(".hamberger-btn");
const hContent=document.querySelector(".hamberger-content");
const crossIcon=document.querySelector(".cross-icon");
const hambergerIcon=document.querySelector(".hamberger-icon");

hBtn.addEventListener("click",()=>{
  if(hContent.style.visibility==="hidden"){
   
    crossIcon.style.visibility="visible";
    hambergerIcon.style.visibility="hidden";
    hContent.style.visibility="visible";
    hContent.style.left="0px";
    // hContent.style.opacity=1;
  }
     
  else {
    crossIcon.style.visibility="hidden";
    hambergerIcon.style.visibility="visible";
    hContent.style.left="-200px";
    hContent.style.visibility="hidden";

  }
     
});

// combo search functionality
function toggleInputField(){
  const comboSelect=document.querySelector("#combo-select");
  const comboInput=document.querySelector("#combo-input");
  

 

  if(comboSelect.value==="Other"){
        comboSelect.style.display="none";
        comboInput.style.display="block";
  }
  else{
    comboInput.style.display="none";
  }
}
console.log("other than homepage");


   

 





