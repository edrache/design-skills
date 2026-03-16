document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.playbook-content');
    const langToggles = document.querySelectorAll('.lang-toggle');
    const body = document.body;
    const html = document.documentElement;

    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mainLayout = document.querySelector('.main-layout');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function getVisibleTabs(lang) {
        return Array.from(tabs).filter((tab) => tab.classList.contains(`lang-${lang}`));
    }

    function syncAriaStates(activeTabId) {
        tabs.forEach((tab) => {
            const isActive = tab.getAttribute('data-tab') === activeTabId;
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            tab.setAttribute('tabindex', isActive ? '0' : '-1');
        });
    }

    if (sidebarToggle && mainLayout) {
        if (localStorage.getItem('sidebar-collapsed') === 'true') {
            mainLayout.classList.add('sidebar-collapsed');
            sidebarToggle.innerText = '⮕';
            sidebarToggle.setAttribute('aria-expanded', 'false');
        } else {
            sidebarToggle.setAttribute('aria-expanded', 'true');
        }

        sidebarToggle.addEventListener('click', () => {
            const isCollapsed = mainLayout.classList.toggle('sidebar-collapsed');
            sidebarToggle.innerText = isCollapsed ? '⮕' : '☰';
            sidebarToggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            localStorage.setItem('sidebar-collapsed', isCollapsed);
        });
    }

    function switchTab(tabId) {
        tabs.forEach((t) => t.classList.toggle('active', t.getAttribute('data-tab') === tabId));
        syncAriaStates(tabId);

        const target = document.getElementById(tabId);
        if (target) {
            target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            const url = new URL(window.location);
            url.hash = tabId;
            window.history.replaceState(null, '', url);
        }
    }

    function switchLanguage(lang) {
        body.classList.forEach((cls) => {
            if (cls.startsWith('lang-')) body.classList.remove(cls);
        });
        body.classList.add(`lang-${lang}`);
        html.lang = lang === 'default' ? 'pl' : lang;

        langToggles.forEach((btn) => {
            const isActive = btn.getAttribute('data-lang') === lang;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        const visibleTabs = getVisibleTabs(lang);
        const nextTab = visibleTabs[0];
        if (nextTab) {
            const nextTabId = nextTab.getAttribute('data-tab');
            tabs.forEach((tab) => tab.classList.toggle('active', tab === nextTab));
            syncAriaStates(nextTabId);
        }

        window.scrollTo(0, 0);
    }

    tabs.forEach((tab) => {
        tab.setAttribute('role', 'tab');
        tab.addEventListener('click', () => {
            switchTab(tab.getAttribute('data-tab'));
        });
    });

    langToggles.forEach((toggle) => {
        toggle.addEventListener('click', () => {
            switchLanguage(toggle.getAttribute('data-lang'));
        });
    });

    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                tabs.forEach((t) => t.classList.toggle('active', t.getAttribute('data-tab') === id));
                syncAriaStates(id);
            }
        });
    }, observerOptions);

    contents.forEach((section) => observer.observe(section));

    const initialHash = window.location.hash.substring(1);
    const availableLangs = Array.from(langToggles).map((t) => t.getAttribute('data-lang'));
    
    let preferredLang = 'default';
    if (initialHash && availableLangs.includes(initialHash.split('_')[0])) {
        preferredLang = initialHash.split('_')[0];
    } else if (availableLangs.includes('en')) {
        preferredLang = 'en';
    } else if (availableLangs.length > 0) {
        preferredLang = availableLangs[0];
    } else if (document.querySelector('.tab.lang-default')) {
        preferredLang = 'default';
    }

    switchLanguage(preferredLang);
    
    if (initialHash) {
        setTimeout(() => {
            const target = document.getElementById(initialHash);
            if (target) {
                switchTab(initialHash);
                target.scrollIntoView({ behavior: 'auto' });
            }
        }, 100);
    } else {
        const initialVisibleTab = getVisibleTabs(preferredLang)[0];
        if (initialVisibleTab) {
            syncAriaStates(initialVisibleTab.getAttribute('data-tab'));
        }
        window.scrollTo(0, 0);
    }
    
    window.generateAdventure = function(lang) {
        const container = document.getElementById(`rng-tables-${lang}`);
        if (!container) return;
        
        const tables = container.querySelectorAll('.adventure-table-card');
        if (tables.length < 6) return;
        
        let parts = [];
        tables.forEach(table => {
            const prefixEl = table.querySelector('.adventure-prefix');
            const items = table.querySelectorAll('.rng-text');
            
            const prefix = prefixEl ? prefixEl.textContent.trim() : "";
            
            if (items.length > 0) {
                const randomText = items[Math.floor(Math.random() * items.length)].textContent.trim();
                parts.push((prefix ? prefix + " " : "") + `<span class="rng-highlight">${randomText}</span>`);
            } else {
                parts.push(prefix);
            }
        });
        
        if (parts.length >= 6) {
            const sentence1 = parts[0] + " " + parts[1] + " " + parts[2];
            const sentence2 = parts[3] + " " + parts[4] + " " + parts[5];
            
            let s1 = sentence1.replace(/\s+/g, ' ').replace(/\s+\./g, '.');
            if(!s1.endsWith('.')) s1 += '.';
            let s2 = sentence2.replace(/\s+/g, ' ').replace(/\s+\./g, '.');
            if(!s2.endsWith('.')) s2 += '.';

            const capitalize = (str) => {
                let inTag = false;
                for (let i = 0; i < str.length; i++) {
                    if (str[i] === '<') inTag = true;
                    else if (str[i] === '>') inTag = false;
                    else if (!inTag && /[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(str[i])) {
                        return str.substring(0, i) + str[i].toUpperCase() + str.substring(i + 1);
                    }
                }
                return str;
            };

            s1 = capitalize(s1);
            s2 = capitalize(s2);
            
            const resultEl = document.getElementById(`rng-result-${lang}`);
            if (resultEl) {
                resultEl.innerHTML = `<p>${s1}</p><p>${s2}</p>`;
            }
        }
    };

    availableLangs.forEach(l => {
        if(document.getElementById(`rng-result-${l}`)) {
            generateAdventure(l);
        }
    });
});
