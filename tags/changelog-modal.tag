<changelog-modal>
  
  <div class="ui small modal changelog-modal">
    <i class="close icon"></i>
    <div class="header">
      <i1-8n>whatsnew.title</i1-8n> { require('electron-is-dev') === true ? "DEV" : require('electron').remote.app.getVersion(); }
    </div>
    <div class="scrolling content">
      <img class="ui fluid rounded image" src="./img/backdrop.png" />
      <h3>v1.9.0</h3>
      <p>
        <ul>
          <li>Fixed problem when checking LOL version on load.</li>
          <li>Added local champion data file in case API call fails.</li>
          <li>Fixed endpoint when fetching U.GG rune pages.</li>
          <li>Added Greek language.</li>
          <li>Updated rune images to reflect the current state <br/>(Missing Omnistone image, etc.).</li>
          <li>Updated perk mappings in some of the plugins.</li>
          <li>Updated the changelog.</li>
        </ul>
      </p>
      <h4>Twitch stream</h4>
        <p>
          In case you like this app, I would appreciate it if you could support my stream.
          You can find it here: <a href="https://twitch.tv/Pwn2OwnLive">Pwn2OwnLive</a>
        </p>
      <hr/>
      <h4 class="ui header right floated">Pwn2OwnLive, 2020-05-23</h4>
    </div>
  </div>

  <script>
    
    this.on('mount', () => {
      $('.changelog-modal').modal({
        duration: 200,
        autofocus: false,
      });

      freezer.emit("changelog:ready");
    });

  </script>

</changelog-modal>