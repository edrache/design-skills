document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation
    document.querySelectorAll('#sidebar a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            document.querySelector(targetId).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Intersection Observer for active link highlighting
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('#sidebar a');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.4
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${entry.target.id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });

    // Add some hover interactivity to emoji cards
    document.querySelectorAll('.emoji-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.borderColor = 'var(--accent-color)';
            card.style.transform = 'translateY(-5px)';
            card.style.transition = 'all 0.3s ease';
        });
        card.addEventListener('mouseleave', () => {
            card.style.borderColor = 'var(--glass-border)';
            card.style.transform = 'translateY(0)';
        });
    });
});
