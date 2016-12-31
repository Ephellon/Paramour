# Paramour
## _"The perfect rendezvous with JavaScript and Python"_

see my [post](https://codepen.io/Ephellon/post/paramour)
----
# How to
## HTML
```html
<!-- something like... -->
<head>
  <script src="paramour.js"></script>
  <script src="script.par" type="text/par"></script>
  <!-- external scripts can be loaded -->
</head>
<body onload="Paramour.compile(true)">
  <script type="text/par">
    # extra Paramour scripts can go here too
  </script>
  <!--
    more code...
  -->
</body>
```

## JavaScript
```js
var input =
`
  # Paramour
  # $doc -> document

  $doc.body.onload = () =>
    log "This is Paramour!";

  var(catcher, item_one, item_two, item_three) = .{123, "abc", /def/g};

  log(String message, ... extra) {
    console.log(message, extra)
  }

  log(catcher, item_one, item_three)
`;

var output = Paramour(input);
```

## Windows Command Line
```bat
paramour file1.par file2.par
:: or
paramour
```

## Java
```java
// something like...
import paramour.Paramour
private static Paramour par = new Paramour();

public static void main(String args[]) {
  // ...
  // gather the file names
  for(int x = 0; x < files.length; x++)
    par.eval(files[x]);
  // ...
}
```
----
# Awesome Features of Paramour
### Functions
```paramour
function_name(parameter) {
  # ...
}

# Or
### Special Types
   *         - Any
   ...       - Spread
   <Element> - HTML Element
###
function_name(Type parameter) {
  # ...
}
```

### Classes
```python
class_name {
  <init>(arguments) {
    # constructor
    # ...
  }
}

super_name.class_name {
  <init> {
    # optional arguments
    # ...
  }
}
```

### Tuples
```javascript
var variable_name = .{
  123,
  "abc",
  /def/g
};
```

# And much more!
see [this](https://Ephellon.github.io/Paramour/)
