// Simple fade-in animation
window.addEventListener("load", () => {
    document.querySelector(".hero-content").style.opacity = "1";
});
// Highlight employer section when clicked
document.querySelector(".employer-link").addEventListener("click", function () {
    const box = document.getElementById("employer-box");

    setTimeout(() => {
        box.style.boxShadow = "0 0 25px rgba(247,148,77,0.7)";
        box.style.transform = "scale(1.05)";

        setTimeout(() => {
            box.style.boxShadow = "";
            box.style.transform = "";
        }, 1500);
    }, 500);
});
const sections = document.querySelectorAll("section");
const navLinks = document.querySelectorAll(".nav-link");

window.addEventListener("scroll", () => {
    let current = "";

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute("id");
        }
    });

    navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("href") === "#" + current) {
            link.classList.add("active");
        }
    });
});