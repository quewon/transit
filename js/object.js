class Object {
    name;
    icon;
    location;
    
    button;
    icon_element;

    constructor(name, icon, onclick) {
        icon = icon || "res/icons/package.svg";

        this.name = name;
        this.icon = icon;

        let button = document.createElement("button");
        button.className = "iconbutton";
        let img = document.createElement("img");
        img.src = icon;
        button.appendChild(img);
        button.onclick = function() {
            if (this.location == player.location) {
                onclick();
                this.location.remove_object(this);
            } else {
                alert("you have to be here to interact with this item.", this.icon);
            }
        }.bind(this);
        this.button = button;

        this.icon_element = button.cloneNode(true);
    }
}

class Contact extends Object {
    job;

    constructor(name, job) {
        super(name, "res/icons/person.svg");

        this.job = job;
        job.icon = this.icon;
        job.contact = this;

        this.button.onclick = job.open.bind(job);
    }

    accept() {
        this.job.accepted = true;
        this.job.open();
    }

    reject() {
        this.location.remove_object(this);
        this.job.close();
        alert(`<b>${this.name}</b> leaves.`, this.icon);
    }

    fulfill() {
        this.location.remove_object(this);
        this.job.close();
        this.job.fulfill();
    }
}

class Job {
    contact;
    icon;
    accepted = false;
    element;

    constructor(p) {
        p = p || {};

        this.element = document.createElement("p");
        this.element.className = "job";
        this.element.innerHTML = `<b>${p.title}</b>:<br><span>${p.description}</span>`;
        this.fulfillable = p.fulfillable;
        this.fulfill = p.fulfill;
    }

    fulfillable() { return true; }
    fulfill() { }

    close() {
        ui.joboffer.close();
        ui.viewjob.close();
    }

    open() {
        this.close();

        if (!this.accepted) {
            ui.joboffer.querySelector(".contact-name").textContent = this.contact.name;
            let accept_button = ui.joboffer.querySelector("[name='accept']");
            let reject_button = ui.joboffer.querySelector("[name='reject']");
            
            accept_button.onclick = this.contact.accept.bind(this.contact);
            reject_button.onclick = this.contact.reject.bind(this.contact);

            ui.joboffer.querySelector(".job").replaceWith(this.element);
            ui.joboffer.showModal();
        } else {
            ui.viewjob.querySelector(".contact-name").textContent = this.contact.name;
            let fulfill_button = ui.viewjob.querySelector("[name='fulfill']");
            if (this.contact.location == player.location && this.fulfillable()) {
                fulfill_button.removeAttribute("disabled");
                fulfill_button.onclick = this.contact.fulfill.bind(this.contact);
            } else {
                fulfill_button.setAttribute("disabled", true);
            }

            ui.viewjob.querySelector(".job").replaceWith(this.element);
            ui.viewjob.showModal();
        }
    }
}