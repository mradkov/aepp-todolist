<template>
  <div class="loader">
    <div class="flex justify-center">
      <ae-loader class="ae-loader-scaling"></ae-loader>
    </div>
  </div>
</template>

<script>
    import {AeLoader} from '@aeternity/aepp-components'

    export default {
        name: "BiggerLoader",
        components: {AeLoader},
        props: ['progress']
    }
</script>

<style scoped>
  .loader {
    position: absolute;
    width: 100%;
  }

  .ae-loader-progress {
    font-size: 1em;
    top: 2em;
    left: 0;
    text-align: center;
  }

  .ae-loader-scaling {
    width: 5em !important;
    height: 5em !important;
    border-radius: 5em !important;
    border-width: 0.4em !important;
  }
</style>
