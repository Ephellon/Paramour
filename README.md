# Paramour
## _"The perfect rendezvous with JavaScript and Python"_
----
# How to
## JavaScript
```js
var input =
`
  # Paramour
  # $doc -> document

  $doc.body.onload = () {
    log("This is Paramour!")
  }

  (catcher, item_one, item_two, item_three) = {{123, "abc", /def/g}};

  log(String message, ... extra) {
    console.log(message, extra)
  }

  log(catcher, item_one, item_three)
`
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
```javascript
function_name(parameter) {
  // ...
}

// Or
/* Special Types
   *   - Any
   ... - Spread
*/
function_name(Type parameter) {
  // ...
}
```

### Classes
```python
class_name {
  <init>(arguments) {
    # constructor
    ...
  }
}

super_name.class_name {
  <init> {
    # optional arguments
    ...
  }
}
```

### Tuples
```javascript
(variable_name) = {{
  123,
  "abc",
  /def/g
}};
```

# And much more
see my [pen](http://codepen.io/Ephellon/pen/XKPVgw)
