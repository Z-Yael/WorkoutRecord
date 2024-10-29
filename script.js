'use strict';
// cadence :number of steps per minutes.
// pace : amout of time to reach a certain distance >> 5min per km
//elevation: vertical distance climbed during a ride (cycling)

class Workout {
  clickedCounts = 0;
  date = new Date();
  id = (Date.now() + '').slice(-10);
  constructor(coords, distance, duration) {
    // this.date = new Date()
    // this.id = ...
    this.coords = coords; //lat,lng
    this.distance = distance; //in km
    this.duration = duration; // in min
  }

  _setDescription() {
    //prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this._description = `${this.type[0].toUpperCase()}${this.type.slice(
      1
    )} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()} ${this.date.getMilliseconds()}`;
  }
  set description(des) {
    this._description = des;
  }
  click() {
    this.clickedCounts += 1;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this.type = 'cycling';
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const run1 = new Running([39, -12], 5, 30, 178);
const cycling1 = new Cycling([39, -12], 20, 60, 498);
// console.log(run1);
// console.log(cycling1);
//////////////////////////////
//Application Archiecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnClear = document.querySelector('.clBtn');
class App {
  #mapZoomLevel = 13;
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    //get user position
    this._getPosition();

    //get data from localstorage
    this._getLocalStoragePositions();

    //attach event handler
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    btnClear.addEventListener('click', this._clearLocalStorage);
  }
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position.');
        }
      );
  }
  _loadMap(position) {
    // console.log(position);
    const { latitude, longitude } = position.coords;
    // console.log(
    //   `https://www.google.co.th/maps/@${latitude},${longitude},13.36z?hl=en&entry=ttu&g_ep=EgoyMDI0MTAxNi4wIKXMDSoASAFQAw%3D%3D`
    // );
    const coords = [latitude, longitude];
    // console.log(this);

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // console.log(L);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.fr/hot/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Handling click on map.
    this.#map.on('click', this._showForm.bind(this));

    //render workout Mark from localstorage workout
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
    console.log('clicked on map.');
  }
  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    //helper function
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const isAllPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();

    //Get data from user input Form
    const type = inputType.value;
    // console.log('Now selecting :', type);
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //If running, create running objcet
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Input validation of user input
      if (
        !validInputs(distance, duration, cadence) ||
        !isAllPositive(distance, duration, cadence)
      )
        return alert('Input has to be positve number.');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //If cycling ,create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // Input validation of user input
      if (
        !validInputs(distance, duration, elevation) ||
        !isAllPositive(distance, duration)
      )
        return alert('Inputs must be positive number.');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //Add new object to workout Array
    this.#workouts.push(workout);
    console.log(workout);
    console.log(this.#workouts);

    //Render workout on map as marker
    this._renderWorkoutMarker(workout);

    //Render workout on List
    this._renderWorkout(workout);

    // Hide form and Clear Input field
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}   ${
          workout._description
        }, ${workout.distance}km`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--running" data-id="${workout.id}">
          <h2 class="workout__title">${workout._description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">=${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;
    if (workout.type === 'running')
      html += `
          <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
              </div>
              <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
              </div>
        </li>
    `;
    if (workout.type === 'cycling')
      html += `
         <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
    `;
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutElement = e.target.closest('.workout');

    // console.log(workoutElement);
    if (!workoutElement) return;
    // console.log(workoutElement.dataset.id);
    const workout = this.#workouts.find(
      work => work.id === workoutElement.dataset.id
    );
    console.log(workout);
    console.log(workout.coords);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    workout.click();
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStoragePositions() {
    const localStorageData = JSON.parse(localStorage.getItem('workouts'));

    if (!localStorageData) return;
    // console.log(localStorageData);
    localStorageData.forEach(currentWorkout => {
      // console.log('Testing ::::', workout.type, workout.distance);
      let workout;
      //If running, create running objcet
      if (currentWorkout.type === 'running') {
        const [coords, distance, duration, cadence] = [
          currentWorkout.coords,
          currentWorkout.distance,
          currentWorkout.duration,
          currentWorkout.cadence,
        ];

        workout = new Running(coords, distance, duration, cadence);
        console.log('---------This is from localstorage --------');
      }

      if (currentWorkout.type === 'cycling') {
        const [coords, distance, duration, elevation] = [
          currentWorkout.coords,
          currentWorkout.distance,
          currentWorkout.duration,
          currentWorkout.elevation,
        ];

        workout = new Cycling(coords, distance, duration, elevation);
        console.log('---------This is from localstorage --------');
      }
      workout.id = currentWorkout.id;
      workout.date = currentWorkout.date;
      workout.clickedCounts = currentWorkout.clickedCounts;
      workout.description = currentWorkout._description;
      console.log(currentWorkout);
      console.log(workout);
      this.#workouts.push(workout);
      console.log('edited workout:', this.#workouts);
    });

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  _clearLocalStorage() {
    const confirmClear = prompt("Type '1' to delete your list");
    if (confirmClear === '1') {
      localStorage.removeItem('workouts');
      location.reload();
    }
  }
}

const app = new App();
