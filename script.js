/* =====================================================
   SAMAYA LEARNING TRACKER - JAVASCRIPT
   Modern, Efficient & Clean Code Architecture
   ===================================================== */

/* =====================================================
   GLOBAL STATE MANAGEMENT
   ===================================================== */
class SamayaTracker {
    constructor() {
        // Core application state
        this.tasks = [];
        this.filteredTasks = [];
        this.currentSearchTerm = '';
        this.focusedTaskId = null;
        this.isInFocusMode = false;
        this.selectedSuggestionIndex = -1;

        // Mobile detection and optimization
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
        this.touchStartY = 0;
        this.touchEndY = 0;

        // Common learning topics for suggestions
        this.commonTopics = [
            'JavaScript', 'Python', 'React', 'Node.js', 'HTML', 'CSS', 'TypeScript',
            'Vue.js', 'Angular', 'Java', 'C++', 'PHP', 'Ruby', 'Go', 'Rust',
            'Machine Learning', 'Data Science', 'Web Development', 'Mobile Development',
            'DevOps', 'Database', 'SQL', 'MongoDB', 'PostgreSQL', 'Docker',
            'Kubernetes', 'AWS', 'Azure', 'Git', 'Linux', 'Algorithms',
            'Data Structures', 'System Design', 'UI/UX Design', 'Graphic Design',
            'Photography', 'Digital Marketing', 'Project Management', 'Agile',
            'Scrum', 'Business Analysis', 'Excel', 'PowerBI', 'Tableau',
            'Mathematics', 'Statistics', 'Physics', 'Chemistry', 'Biology',
            'Language Learning', 'Spanish', 'French', 'German', 'Mandarin',
            'Music Theory', 'Guitar', 'Piano', 'Drawing', 'Painting',
            'Reading', 'Writing', 'Research', 'Meditation', 'Yoga'
        ];

        // Constants
        this.MAX_TASKS = 1000;
        this.MAX_TASK_NAME_LENGTH = 50;
        this.MAX_TIME_AWAY_HOURS = 24;
        this.MAX_TIME_VALUE = 999999999; // ~31 years in seconds
        this.AUTO_SAVE_INTERVAL = 5000; // 5 seconds

        // Initialize the application
        this.init();
    }

    /* =====================================================
       INITIALIZATION & LIFECYCLE
       ===================================================== */
    init() {
        this.setupEventListeners();
        this.setupAutoSave();
        this.loadData();
    }

    setupEventListeners() {
        // Task form submission
        const taskNameInput = document.getElementById('taskName');
        if (taskNameInput) {
            taskNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addTask();
                }
            });
        }

        // Search functionality
        this.setupSearchListeners();

        // Global click handler for closing menus
        document.addEventListener('click', (e) => {
            this.closeOpenMenus(e);
        });

        // Mobile-specific touch optimizations
        if (this.isMobile) {
            this.setupMobileOptimizations();
        }

        // Page lifecycle events
        this.setupPageLifecycleEvents();
    }

    setupSearchListeners() {
        const searchInput = document.getElementById('searchInput');
        const searchSuggestions = document.getElementById('searchSuggestions');

        if (!searchInput || !searchSuggestions) return;

        searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e);
        });

        searchInput.addEventListener('keydown', (e) => {
            this.handleSearchKeydown(e);
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                searchSuggestions.classList.remove('show');
                this.selectedSuggestionIndex = -1;
            }, 150);
        });
    }

    setupPageLifecycleEvents() {
        // Save data when page is about to unload
        window.addEventListener('beforeunload', () => {
            this.saveData();
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveData();
            } else {
                this.handlePageBecameVisible();
            }
        });
    }

    setupMobileOptimizations() {
        // Prevent iOS zoom on input focus
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                if (this.isMobile) {
                    // Temporarily disable viewport scaling
                    const viewport = document.querySelector('meta[name=viewport]');
                    if (viewport) {
                        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
                    }
                }
            });

            input.addEventListener('blur', () => {
                if (this.isMobile) {
                    // Re-enable viewport scaling
                    const viewport = document.querySelector('meta[name=viewport]');
                    if (viewport) {
                        setTimeout(() => {
                            viewport.setAttribute('content', 'width=device-width, initial-scale=1, user-scalable=yes');
                        }, 100);
                    }
                }
            });
        });

        // Optimize touch scrolling
        document.body.style.webkitOverflowScrolling = 'touch';

        // Add passive listeners for better performance
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });

        // Optimize animations for mobile
        if (this.isMobile) {
            document.documentElement.style.setProperty('--transition-normal', '0.15s ease');
            document.documentElement.style.setProperty('--transition-slow', '0.2s ease');
        }
    }

    handleTouchStart(e) {
        this.touchStartY = e.touches[0].clientY;
    }

    handleTouchEnd(e) {
        this.touchEndY = e.changedTouches[0].clientY;

        // Handle swipe gestures if needed (for future enhancements)
        const swipeDistance = this.touchStartY - this.touchEndY;
        const minSwipeDistance = 50;

        if (Math.abs(swipeDistance) > minSwipeDistance) {
            // Swipe up/down detection for future features
        }
    }

    setupAutoSave() {
        // Auto-save every 5 seconds
        setInterval(() => {
            this.saveData();
        }, this.AUTO_SAVE_INTERVAL);
    }

    /* =====================================================
       DATA PERSISTENCE & VALIDATION
       ===================================================== */
    loadData() {
        try {
            const savedTasks = localStorage.getItem('samaya-tasks');
            const savedLastUpdate = localStorage.getItem('samaya-last-update');
            const savedFocusMode = localStorage.getItem('samaya-focus-mode');
            const savedFocusedTaskId = localStorage.getItem('samaya-focused-task-id');

            // Load and validate tasks
            if (savedTasks && savedTasks !== 'null' && savedTasks !== 'undefined') {
                const parsedTasks = JSON.parse(savedTasks);

                if (Array.isArray(parsedTasks)) {
                    this.tasks = parsedTasks
                        .filter(task => this.validateTask(task))
                        .map(task => this.sanitizeTask(task));

                    // Ensure only one task can be running
                    this.enforceBusinessRules();

                    // Calculate elapsed time for running tasks
                    this.calculateElapsedTime(savedLastUpdate);

                    // Restart intervals for running tasks
                    this.restartRunningTasks();
                }
            }

            // Restore focus mode state
            this.restoreFocusMode(savedFocusMode, savedFocusedTaskId);

        } catch (error) {
            console.warn('Error loading saved data, starting fresh:', error);
            this.resetToCleanState();
        }

        this.renderTasks();
        this.updateStats();
    }

    saveData() {
        try {
            // Validate data before saving
            const validTasks = this.tasks.filter(task => this.validateTask(task));

            if (validTasks.length !== this.tasks.length) {
                console.warn('Some invalid tasks were filtered out during save');
                this.tasks = validTasks;
            }

            localStorage.setItem('samaya-tasks', JSON.stringify(this.tasks));
            localStorage.setItem('samaya-last-update', Date.now().toString());
            localStorage.setItem('samaya-focus-mode', this.isInFocusMode.toString());
            localStorage.setItem('samaya-focused-task-id', this.focusedTaskId ? this.focusedTaskId.toString() : '');

        } catch (error) {
            console.error('Error saving data to localStorage:', error);
            if (error.name === 'QuotaExceededError') {
                alert('Storage quota exceeded. Please delete some old tasks to continue.');
            }
        }
    }

    validateTask(task) {
        return task &&
            typeof task === 'object' &&
            typeof task.id === 'number' &&
            typeof task.name === 'string' &&
            task.name.trim().length > 0 &&
            task.name.length <= this.MAX_TASK_NAME_LENGTH &&
            typeof task.time === 'number' &&
            task.time >= 0 &&
            task.time < this.MAX_TIME_VALUE &&
            typeof task.isRunning === 'boolean' &&
            typeof task.createdAt === 'string' &&
            !isNaN(Date.parse(task.createdAt));
    }

    sanitizeTask(task) {
        return {
            id: Math.max(1, Math.floor(Math.abs(task.id))),
            name: String(task.name).trim().substring(0, this.MAX_TASK_NAME_LENGTH),
            time: Math.max(0, Math.floor(Math.abs(task.time || 0))),
            interval: null, // Always reset intervals on load
            isRunning: Boolean(task.isRunning),
            createdAt: task.createdAt || new Date().toISOString()
        };
    }

    enforceBusinessRules() {
        let runningCount = 0;
        this.tasks.forEach(task => {
            if (task.isRunning) {
                runningCount++;
                if (runningCount > 1) {
                    task.isRunning = false;
                    task.interval = null;
                }
            }
        });
    }

    calculateElapsedTime(savedLastUpdate) {
        if (savedLastUpdate && !isNaN(parseInt(savedLastUpdate))) {
            const timeAway = Math.floor((Date.now() - parseInt(savedLastUpdate)) / 1000);
            const maxTimeAway = this.MAX_TIME_AWAY_HOURS * 60 * 60;
            const validTimeAway = Math.min(Math.max(timeAway, 0), maxTimeAway);

            this.tasks.forEach(task => {
                if (task.isRunning) {
                    task.time = Math.max(0, task.time + validTimeAway);
                }
            });
        }
    }

    restartRunningTasks() {
        this.tasks.forEach(task => {
            if (task.isRunning) {
                this.startTaskTimer(task.id);
            }
        });
    }

    restoreFocusMode(savedFocusMode, savedFocusedTaskId) {
        if (savedFocusMode === 'true' && savedFocusedTaskId && !isNaN(parseInt(savedFocusedTaskId))) {
            const taskExists = this.tasks.find(t => t.id === parseInt(savedFocusedTaskId));
            if (taskExists) {
                setTimeout(() => {
                    this.enterFocusMode(parseInt(savedFocusedTaskId));
                }, 100);
            }
        }
    }

    resetToCleanState() {
        this.tasks = [];
        localStorage.removeItem('samaya-tasks');
        localStorage.removeItem('samaya-last-update');
        localStorage.removeItem('samaya-focus-mode');
        localStorage.removeItem('samaya-focused-task-id');
    }

    handlePageBecameVisible() {
        const savedLastUpdate = localStorage.getItem('samaya-last-update');
        if (savedLastUpdate) {
            const timeAway = Math.floor((Date.now() - parseInt(savedLastUpdate)) / 1000);
            this.tasks.forEach(task => {
                if (task.isRunning) {
                    task.time += timeAway;
                }
            });
            this.renderTasks();
            this.updateStats();
        }
    }

    /* =====================================================
       TASK MANAGEMENT
       ===================================================== */
    addTask() {
        const nameInput = document.getElementById("taskName");
        const name = nameInput.value.trim();

        // Enhanced input validation
        if (!name) {
            alert("Please enter a task name!");
            return;
        }

        if (name.length > this.MAX_TASK_NAME_LENGTH) {
            alert(`Task name must be ${this.MAX_TASK_NAME_LENGTH} characters or less!`);
            return;
        }

        if (this.tasks.length >= this.MAX_TASKS) {
            alert(`Maximum number of tasks (${this.MAX_TASKS}) reached. Please delete some tasks first.`);
            return;
        }

        // Check for duplicate task names
        const duplicateExists = this.tasks.some(task =>
            task.name.toLowerCase() === name.toLowerCase()
        );

        if (duplicateExists) {
            const confirmDuplicate = confirm(`A task named "${name}" already exists. Create anyway?`);
            if (!confirmDuplicate) {
                return;
            }
        }

        // Create new task
        const task = {
            id: Date.now() + Math.random(),
            name: name,
            time: 0,
            interval: null,
            isRunning: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(task);
        nameInput.value = "";
        this.renderTasks();
        this.updateStats();
        this.saveData();
    }

    startTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task || task.isRunning) return;

        // Ensure only ONE task can run at a time
        const currentlyRunning = this.tasks.filter(t => t.isRunning);
        if (currentlyRunning.length > 0) {
            const shouldPauseOthers = confirm(
                `"${currentlyRunning[0].name}" is currently running. Pause it and start "${task.name}"?`
            );
            if (!shouldPauseOthers) {
                return;
            }
            currentlyRunning.forEach(t => this.pauseTask(t.id));
        }

        task.isRunning = true;
        this.startTaskTimer(id);
        this.renderTasks();
        this.updateStats();
        this.saveData();
    }

    startTaskTimer(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        // Clear any existing interval
        if (task.interval) {
            clearInterval(task.interval);
        }

        task.interval = setInterval(() => {
            const currentTask = this.tasks.find(t => t.id === id);
            if (!currentTask || !currentTask.isRunning) {
                clearInterval(task.interval);
                return;
            }

            currentTask.time = Math.max(0, currentTask.time + 1);

            // Safety check: prevent time overflow
            if (currentTask.time > this.MAX_TIME_VALUE) {
                this.pauseTask(id);
                alert('Timer limit reached for task: ' + currentTask.name);
                return;
            }

            // Update UI
            const timeElement = document.getElementById("time-" + task.id);
            if (timeElement) {
                timeElement.textContent = this.formatTime(currentTask.time);
            }
            this.updateStats();
        }, 1000);
    }

    pauseTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        clearInterval(task.interval);
        task.interval = null;
        task.isRunning = false;
        this.renderTasks();
        this.updateStats();
        this.saveData();
    }

    resetTask(id, event) {
        if (event) {
            event.stopPropagation();
        }

        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        // Close the menu
        this.closeTaskMenu(id);

        clearInterval(task.interval);
        task.interval = null;
        task.isRunning = false;
        task.time = 0;
        this.renderTasks();
        this.updateStats();
        this.saveData();
    }

    deleteTask(id, event) {
        if (event) {
            event.stopPropagation();
        }

        const taskIndex = this.tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) return;

        const task = this.tasks[taskIndex];

        // Clean up
        if (task.interval) {
            clearInterval(task.interval);
        }

        // Exit focus mode if deleting focused task
        if (this.isInFocusMode && this.focusedTaskId === id) {
            this.exitFocusMode();
        }

        // Close menu and remove task
        this.closeTaskMenu(id);
        this.tasks.splice(taskIndex, 1);

        this.renderTasks();
        this.updateStats();
        this.saveData();
    }

    /* =====================================================
       SEARCH FUNCTIONALITY
       ===================================================== */
    handleSearchInput(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        this.currentSearchTerm = searchTerm;
        this.selectedSuggestionIndex = -1;

        if (searchTerm === '') {
            this.filteredTasks = [];
            this.hideSearchSuggestions();
            this.renderTasks();
            return;
        }

        // Filter existing tasks
        this.filteredTasks = this.tasks.filter(task =>
            task.name.toLowerCase().includes(searchTerm)
        );

        // Show suggestions
        this.showSearchSuggestions(searchTerm);
        this.renderTasks();
    }

    handleSearchKeydown(e) {
        const searchSuggestions = document.getElementById('searchSuggestions');
        const suggestions = searchSuggestions.querySelectorAll('.suggestion-item');

        if (!searchSuggestions.classList.contains('show') || suggestions.length === 0) {
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedSuggestionIndex = Math.min(this.selectedSuggestionIndex + 1, suggestions.length - 1);
                this.updateSelectedSuggestion();
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
                this.updateSelectedSuggestion();
                break;

            case 'Enter':
                e.preventDefault();
                if (this.selectedSuggestionIndex >= 0 && this.selectedSuggestionIndex < suggestions.length) {
                    suggestions[this.selectedSuggestionIndex].click();
                }
                break;

            case 'Escape':
                e.preventDefault();
                this.hideSearchSuggestions();
                this.selectedSuggestionIndex = -1;
                break;
        }
    }

    showSearchSuggestions(searchTerm) {
        const searchSuggestions = document.getElementById('searchSuggestions');
        if (searchTerm.length < 2) {
            this.hideSearchSuggestions();
            return;
        }

        // Find matching topics and tasks
        const matchingTopics = this.commonTopics.filter(topic =>
            topic.toLowerCase().includes(searchTerm) &&
            !this.tasks.some(task => task.name.toLowerCase() === topic.toLowerCase())
        ).slice(0, 5);

        const matchingTasks = this.tasks.filter(task =>
            task.name.toLowerCase().includes(searchTerm)
        ).slice(0, 3);

        searchSuggestions.innerHTML = '';

        // Add existing task matches
        this.addTaskSuggestions(matchingTasks, searchSuggestions);

        // Add topic suggestions
        this.addTopicSuggestions(matchingTopics, searchSuggestions, matchingTasks.length);

        // Show no results if nothing found
        if (matchingTasks.length === 0 && matchingTopics.length === 0) {
            this.addNoResultsMessage(searchSuggestions);
        }

        searchSuggestions.classList.add('show');
    }

    addTaskSuggestions(matchingTasks, container) {
        matchingTasks.forEach((task, index) => {
            const item = this.createSuggestionItem(
                'fas fa-clock',
                this.escapeHtml(task.name),
                () => this.selectExistingTask(task),
                index
            );
            container.appendChild(item);
        });
    }

    addTopicSuggestions(matchingTopics, container, offset) {
        matchingTopics.forEach((topic, index) => {
            const item = this.createSuggestionItem(
                'fas fa-lightbulb',
                topic,
                () => this.selectNewTopic(topic),
                offset + index
            );
            container.appendChild(item);
        });
    }

    createSuggestionItem(iconClass, text, clickHandler, index) {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `
            <i class="${iconClass}"></i>
            <span>${text}</span>
        `;
        item.addEventListener('click', clickHandler);
        item.addEventListener('mouseenter', () => {
            this.selectedSuggestionIndex = index;
            this.updateSelectedSuggestion();
        });
        return item;
    }

    selectExistingTask(task) {
        const searchInput = document.getElementById('searchInput');
        searchInput.value = task.name;
        this.currentSearchTerm = task.name.toLowerCase();
        this.filteredTasks = [task];
        this.hideSearchSuggestions();
        this.renderTasks();
    }

    selectNewTopic(topic) {
        const taskNameInput = document.getElementById('taskName');
        const searchInput = document.getElementById('searchInput');

        taskNameInput.value = topic;
        searchInput.value = '';
        this.currentSearchTerm = '';
        this.filteredTasks = [];
        this.hideSearchSuggestions();
        this.renderTasks();
    }

    addNoResultsMessage(container) {
        const item = document.createElement('div');
        item.className = 'no-results';
        item.textContent = 'No suggestions found';
        container.appendChild(item);
    }

    updateSelectedSuggestion() {
        const suggestions = document.querySelectorAll('.suggestion-item');
        suggestions.forEach(suggestion => suggestion.classList.remove('active'));

        if (this.selectedSuggestionIndex >= 0 && this.selectedSuggestionIndex < suggestions.length) {
            suggestions[this.selectedSuggestionIndex].classList.add('active');
            suggestions[this.selectedSuggestionIndex].scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }

    hideSearchSuggestions() {
        const searchSuggestions = document.getElementById('searchSuggestions');
        searchSuggestions.classList.remove('show');
    }

    /* =====================================================
       FOCUS MODE FUNCTIONALITY
       ===================================================== */
    goToHome() {
        if (this.isInFocusMode) {
            this.exitFocusMode();
        }

        // Clear search filters
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        this.currentSearchTerm = '';
        this.filteredTasks = [];

        this.hideSearchSuggestions();
        this.renderTasks();
        this.saveData();
    }

    enterFocusMode(taskId) {
        this.focusedTaskId = taskId;
        this.isInFocusMode = true;

        // Apply focus mode classes
        this.applyFocusClasses(true);

        this.renderTasks();
        this.scrollToTop();
        this.saveData();
    }

    exitFocusMode() {
        this.focusedTaskId = null;
        this.isInFocusMode = false;

        // Remove focus mode classes
        this.applyFocusClasses(false);

        this.renderTasks();
        this.saveData();
    }

    scrollToTop() {
        if (this.isMobile) {
            // Use requestAnimationFrame for smoother mobile scrolling
            const startY = window.pageYOffset;
            const startTime = Date.now();
            const duration = 300;

            const animateScroll = () => {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function for smooth animation
                const easeOut = 1 - Math.pow(1 - progress, 3);

                window.scrollTo(0, startY * (1 - easeOut));

                if (progress < 1) {
                    requestAnimationFrame(animateScroll);
                }
            };

            requestAnimationFrame(animateScroll);
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    applyFocusClasses(focused) {
        const elements = [
            '.container',
            '.header',
            '.stats',
            '.add-task-section',
            '.tasks-grid'
        ];

        elements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                if (focused) {
                    element.classList.add('focused');
                } else {
                    element.classList.remove('focused');
                }
            }
        });
    }

    handleTaskCardClick(taskId, event) {
        // Don't trigger focus mode if clicking on interactive elements
        if (event.target.closest('.task-dropdown') ||
            event.target.closest('.task-actions') ||
            event.target.closest('button')) {
            return;
        }

        if (!this.isInFocusMode) {
            this.enterFocusMode(taskId);
        }
    }

    /* =====================================================
       UI RENDERING & UPDATES
       ===================================================== */
    renderTasks() {
        const taskList = document.getElementById("taskList");
        const emptyState = document.getElementById("emptyState");

        // Determine which tasks to render
        let tasksToRender = this.currentSearchTerm ? this.filteredTasks : this.tasks;

        if (this.isInFocusMode && this.focusedTaskId) {
            tasksToRender = this.tasks.filter(task => task.id === this.focusedTaskId);
        }

        // Handle empty state
        if (tasksToRender.length === 0) {
            this.showEmptyState(taskList, emptyState);
            return;
        }

        // Render tasks
        this.showTaskList(taskList, emptyState, tasksToRender);
    }

    showEmptyState(taskList, emptyState) {
        taskList.innerHTML = "";

        if (this.currentSearchTerm) {
            emptyState.innerHTML = `
                <i class="fas fa-search"></i>
                <h3>No tasks found</h3>
                <p>No tasks match your search for "${this.escapeHtml(this.currentSearchTerm)}"</p>
            `;
        } else {
            emptyState.innerHTML = `
                <i class="fas fa-clock"></i>
                <h3>No tasks yet</h3>
                <p>Add your first learning task to get started</p>
            `;
        }
        emptyState.style.display = "block";
    }

    showTaskList(taskList, emptyState, tasksToRender) {
        emptyState.style.display = "none";
        taskList.innerHTML = "";

        // Sort tasks by creation date (newest first)
        const sortedTasks = [...tasksToRender].sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        sortedTasks.forEach(task => {
            const taskCard = this.createTaskCard(task);
            taskList.appendChild(taskCard);
        });
    }

    createTaskCard(task) {
        const div = document.createElement("div");
        let cardClasses = `task-card ${task.isRunning ? 'running' : ''}`;

        // Add focus mode classes
        if (this.isInFocusMode) {
            if (task.id === this.focusedTaskId) {
                cardClasses += ' focused';
            } else {
                cardClasses += ' unfocused';
            }
        }

        div.className = cardClasses;

        // Add click handler for focus mode
        if (!this.isInFocusMode) {
            div.addEventListener('click', (e) => this.handleTaskCardClick(task.id, e));
        }

        // Generate task card HTML
        div.innerHTML = this.generateTaskCardHTML(task);

        return div;
    }

    generateTaskCardHTML(task) {
        const statusInfo = this.getTaskStatusInfo(task);
        const dateInfo = this.getTaskDateInfo(task);
        const backButton = this.isInFocusMode && task.id === this.focusedTaskId ?
            '<button class="task-card-back-btn" onclick="samaya.exitFocusMode()"><i class="fas fa-arrow-left"></i></button>' : '';
        const runningIndicator = task.isRunning ?
            '<div class="running-indicator"><i class="fas fa-bolt"></i> Active</div>' : '';

        return `
            ${backButton}
            ${runningIndicator}
            <div class="task-header">
                <div class="task-header-content">
                    <h3 class="task-title">${this.escapeHtml(task.name)}</h3>
                    <div class="task-date">
                        <i class="fas fa-calendar-alt"></i>
                        ${dateInfo.date} at ${dateInfo.time}
                    </div>
                    <span class="task-status ${statusInfo.class}">
                        <i class="fas ${statusInfo.icon}"></i>
                        ${statusInfo.text}
                    </span>
                </div>
            </div>

            <div class="time-display">
                <div class="time-value" id="time-${task.id}">${this.formatTime(task.time)}</div>
                <div class="time-label">Hours : Minutes : Seconds</div>
            </div>

            <div class="task-actions">
                <button class="control-btn btn-start" onclick="samaya.startTask(${task.id})" ${task.isRunning ? 'disabled' : ''}>
                    <i class="fas fa-play"></i>
                    Start
                </button>
                <button class="control-btn btn-pause" onclick="samaya.pauseTask(${task.id})" ${!task.isRunning ? 'disabled' : ''}>
                    <i class="fas fa-pause"></i>
                    Pause
                </button>
                <div style="position: relative;">
                    <button class="task-menu-btn" onclick="samaya.toggleTaskMenu(${task.id})" id="menu-btn-${task.id}">
                        <i class="fas fa-cog"></i>
                    </button>
                    <div class="task-dropdown" id="task-menu-${task.id}">
                        <button class="task-dropdown-item" onclick="samaya.resetTask(${task.id}, event)">
                            <i class="fas fa-undo"></i>
                            <span>Reset Timer</span>
                        </button>
                        <button class="task-dropdown-item delete" onclick="samaya.confirmDeleteTask(${task.id}, event)">
                            <i class="fas fa-trash"></i>
                            <span>Delete Task</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getTaskStatusInfo(task) {
        if (task.isRunning) {
            return { class: 'status-running', text: 'Running', icon: 'fa-play' };
        } else if (task.time > 0) {
            return { class: 'status-paused', text: 'Paused', icon: 'fa-pause' };
        } else {
            return { class: 'status-stopped', text: 'Stopped', icon: 'fa-stop' };
        }
    }

    getTaskDateInfo(task) {
        const createdDate = new Date(task.createdAt);
        const date = createdDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        const time = createdDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        return { date, time };
    }

    updateStats() {
        try {
            if (!Array.isArray(this.tasks)) {
                this.tasks = [];
            }

            const totalTasks = Math.max(0, this.tasks.length);
            const activeTasks = Math.max(0, this.tasks.filter(task =>
                task && typeof task.isRunning === 'boolean' && task.isRunning
            ).length);

            const totalSeconds = this.tasks.reduce((sum, task) => {
                if (task && typeof task.time === 'number' && task.time >= 0) {
                    return sum + Math.min(task.time, this.MAX_TIME_VALUE);
                }
                return sum;
            }, 0);

            // Update DOM elements
            this.updateStatElement('totalTasks', totalTasks);
            this.updateStatElement('activeTasks', activeTasks);
            this.updateStatElement('totalTime', this.formatTime(Math.max(0, totalSeconds)));

            // Business logic validation
            this.validateBusinessLogic(activeTasks);

        } catch (error) {
            console.error('Error updating stats:', error);
            this.setFallbackStats();
        }
    }

    updateStatElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    setFallbackStats() {
        this.updateStatElement('totalTasks', '0');
        this.updateStatElement('activeTasks', '0');
        this.updateStatElement('totalTime', '00:00:00');
    }

    validateBusinessLogic(activeTasks) {
        if (activeTasks > 1) {
            console.warn('Multiple active tasks detected, correcting...');
            let foundFirst = false;
            this.tasks.forEach(task => {
                if (task.isRunning) {
                    if (foundFirst) {
                        this.pauseTask(task.id);
                    } else {
                        foundFirst = true;
                    }
                }
            });
        }
    }

    /* =====================================================
       MENU & INTERACTION HANDLERS
       ===================================================== */
    toggleTaskMenu(taskId) {
        const menu = document.getElementById(`task-menu-${taskId}`);
        const allMenus = document.querySelectorAll('.task-dropdown');

        // Close all other menus
        allMenus.forEach(m => {
            if (m !== menu) {
                m.classList.remove('show');
            }
        });

        // Toggle current menu
        menu.classList.toggle('show');
    }

    closeTaskMenu(taskId) {
        const menu = document.getElementById(`task-menu-${taskId}`);
        if (menu) {
            menu.classList.remove('show');
        }
    }

    closeOpenMenus(event) {
        document.querySelectorAll('.task-dropdown.show').forEach(menu => {
            if (!menu.parentElement.contains(event.target)) {
                menu.classList.remove('show');
            }
        });
    }

    confirmDeleteTask(id, event) {
        if (event) {
            event.stopPropagation();
        }

        // Create custom confirmation dialog
        const confirmDialog = this.createConfirmDialog(id);
        document.body.appendChild(confirmDialog);

        // Store reference for easy cleanup
        this.currentDialog = confirmDialog;
    }

    createConfirmDialog(taskId) {
        const confirmDialog = document.createElement('div');
        confirmDialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        confirmDialog.innerHTML = `
            <div style="
                background: white;
                padding: 2rem;
                border-radius: 16px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                max-width: 400px;
                text-align: center;
            ">
                <div style="
                    width: 64px;
                    height: 64px;
                    background: linear-gradient(135deg, #fee2e2, #fecaca);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1rem;
                    color: #dc2626;
                    font-size: 1.5rem;
                ">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 style="margin-bottom: 0.5rem; color: #374151;">Delete Task?</h3>
                <p style="margin-bottom: 2rem; color: #6b7280;">This action cannot be undone. All time data for this task will be permanently lost.</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button onclick="samaya.cancelDelete()" style="
                        padding: 0.75rem 1.5rem;
                        border: 2px solid #d1d5db;
                        border-radius: 8px;
                        background: white;
                        color: #374151;
                        cursor: pointer;
                        font-weight: 500;
                    ">Cancel</button>
                    <button onclick="samaya.executeDelete(${taskId})" style="
                        padding: 0.75rem 1.5rem;
                        border: none;
                        border-radius: 8px;
                        background: linear-gradient(135deg, #dc2626, #b91c1c);
                        color: white;
                        cursor: pointer;
                        font-weight: 500;
                    ">Delete Task</button>
                </div>
            </div>
        `;

        return confirmDialog;
    }

    cancelDelete() {
        if (this.currentDialog && this.currentDialog.parentNode) {
            document.body.removeChild(this.currentDialog);
            this.currentDialog = null;
        }
    }

    executeDelete(taskId) {
        if (this.currentDialog && this.currentDialog.parentNode) {
            document.body.removeChild(this.currentDialog);
            this.currentDialog = null;
        }
        this.deleteTask(taskId);
    }

    /* =====================================================
       UTILITY FUNCTIONS
       ===================================================== */
    formatTime(seconds) {
        const validSeconds = Math.max(0, Math.floor(Math.abs(seconds || 0)));
        const maxDisplaySeconds = 999 * 3600 + 59 * 60 + 59;
        const safeSeconds = Math.min(validSeconds, maxDisplaySeconds);

        const hrs = Math.floor(safeSeconds / 3600);
        const mins = Math.floor((safeSeconds % 3600) / 60);
        const secs = safeSeconds % 60;

        return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/* =====================================================
   GLOBAL FUNCTIONS FOR HTML ONCLICK HANDLERS
   ===================================================== */
let samaya;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    samaya = new SamayaTracker();
});

// Global functions for HTML onclick handlers
function addTask() {
    if (samaya) samaya.addTask();
}

function startTask(id) {
    if (samaya) samaya.startTask(id);
}

function pauseTask(id) {
    if (samaya) samaya.pauseTask(id);
}

function goToHome() {
    if (samaya) samaya.goToHome();
}
